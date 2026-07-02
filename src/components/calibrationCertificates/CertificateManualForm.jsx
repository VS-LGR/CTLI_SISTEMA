import React, { useCallback, useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { emptyColetaPayload, UNIDADE_OPTIONS, TIPO_BALANCA_OPTIONS, TIPO_PLATAFORMA_OPTIONS } from "@/lib/coletaSchema";
import { balanceSnapshotFromScaleRegistration } from "@/lib/scaleRegistrations/scaleRegistrationUtils";
import { createScaleRegistrationFromBalance } from "@/lib/scaleRegistrations/scaleRegistrationApi";
import { calculateAirDensityFromEnvironmental, formatAirDensityDisplay } from "@/lib/certificateCalculations/environmentalCalculations";
import PointRegistrationPanel from "@/components/calibrationCertificates/PointRegistrationPanel";
import EccentricityTestFields from "@/components/calibrationCertificates/EccentricityTestFields";
import TbhCorrectionPanel from "@/components/coleta/TbhCorrectionPanel";
import PointMaxToleranceFields from "@/components/forms/PointMaxToleranceFields";
import ScaleIndicationRangesFields from "@/components/forms/ScaleIndicationRangesFields";
import ColetaVersoForm from "@/components/coleta/ColetaVersoForm";
import {
  coletaPointToPanelPoint,
  panelPointToColetaPoint,
  syncColetaPontosFromRepeatability,
  syncRepeatabilityFromPanelPoint,
} from "@/lib/calibrationCertificates/certificatePointUtils";
import { toast } from "sonner";
import { FloppyDisk } from "@phosphor-icons/react";

const POINT_COUNT = 10;

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default function CertificateManualForm({ tenantId, certType, onSubmit, submitting }) {
  const [endCustomers, setEndCustomers] = useState([]);
  const [scales, setScales] = useState([]);
  const [weightItems, setWeightItems] = useState([]);
  const [weightCerts, setWeightCerts] = useState([]);
  const [envCerts, setEnvCerts] = useState([]);
  const [employees, setEmployees] = useState([]);

  const [endCustomerId, setEndCustomerId] = useState("");
  const [scaleId, setScaleId] = useState("");
  const [calibrationDate, setCalibrationDate] = useState(todayIso());
  const [executorId, setExecutorId] = useState("");
  const [legalMetrology, setLegalMetrology] = useState(false);
  const [registerScaleForFuture, setRegisterScaleForFuture] = useState(false);
  const [savingScale, setSavingScale] = useState(false);
  const [payload, setPayload] = useState(() => {
    const p = emptyColetaPayload();
    p.calibracao.pontos = p.calibracao.pontos.slice(0, POINT_COUNT);
    return p;
  });

  const load = useCallback(async () => {
    if (!tenantId) return;
    const [c, s, w, wc, e, em] = await Promise.all([
      supabase.from("end_customer_registrations").select("*").eq("tenant_id", tenantId).order("name"),
      supabase.from("scale_registrations").select("*").eq("tenant_id", tenantId).eq("active", true).order("serial_number"),
      supabase.from("standard_weight_items").select("*").eq("tenant_id", tenantId).eq("active", true).order("identification"),
      supabase.from("weight_standard_certificates").select("*").eq("tenant_id", tenantId),
      supabase.from("environment_sensor_certificates").select("*").eq("tenant_id", tenantId).order("equipment_name"),
      supabase.from("employee_registrations").select("*").eq("tenant_id", tenantId).order("full_name"),
    ]);
    if (!c.error) setEndCustomers(c.data || []);
    if (!s.error) setScales(s.data || []);
    if (!w.error) setWeightItems(w.data || []);
    if (!wc.error) setWeightCerts(wc.data || []);
    if (!e.error) setEnvCerts(e.data || []);
    if (!em.error) setEmployees(em.data || []);
  }, [tenantId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!endCustomerId) return;
    const c = endCustomers.find((x) => x.id === endCustomerId);
    if (!c) return;
    setPayload((p) => ({
      ...p,
      cliente: { ...p.cliente, cliente: c.name, responsavel: c.representative_name || "" },
      balanca: { ...p.balanca, local: c.full_address || c.address || "" },
    }));
  }, [endCustomerId, endCustomers]);

  useEffect(() => {
    if (!scaleId) return;
    const s = scales.find((x) => x.id === scaleId);
    if (!s) return;
    const snap = balanceSnapshotFromScaleRegistration(s);
    setPayload((p) => ({
      ...p,
      balanca: { ...p.balanca, ...snap, local: p.balanca.local || "" },
    }));
    setLegalMetrology(Boolean(s.portaria_inmetro || s.etiqueta_ipem));
  }, [scaleId, scales]);

  const setAmbiente = (k, v) => setPayload((p) => ({ ...p, ambiente: { ...p.ambiente, [k]: v } }));
  const setBalanca = (k, v) => setPayload((p) => ({ ...p, balanca: { ...p.balanca, [k]: v } }));
  const setExcentricidade = (excentricidade) => setPayload((p) => ({ ...p, excentricidade }));

  const defaultUnit = payload.balanca.unidade || "g";
  const isManualBalance = !scaleId;

  const calculatedAirDensity = calculateAirDensityFromEnvironmental({
    initial_temperature: payload.ambiente.temp_inicial,
    final_temperature: payload.ambiente.temp_final,
    initial_humidity: payload.ambiente.umidade_inicial,
    final_humidity: payload.ambiente.umidade_final,
    initial_pressure: payload.ambiente.pressao_inicial,
    final_pressure: payload.ambiente.pressao_final,
  });

  const scalesForCustomer = useMemo(() => {
    if (!endCustomerId) return scales;
    const linked = scales.filter((s) => s.end_customer_id === endCustomerId);
    return linked.length ? linked : scales;
  }, [scales, endCustomerId]);

  const panelPoints = useMemo(
    () => payload.calibracao.pontos.map((pt, i) => coletaPointToPanelPoint(pt, i + 1, payload.balanca)),
    [payload.calibracao.pontos, payload.balanca],
  );

  const onPointChange = (pointNumber, fields) => {
    setPayload((p) => {
      const pontos = [...p.calibracao.pontos];
      const idx = pointNumber - 1;
      const current = coletaPointToPanelPoint(pontos[idx] || {}, pointNumber, p.balanca);
      const merged = { ...current, ...fields };
      pontos[idx] = panelPointToColetaPoint(merged, p.balanca);

      const touchesLoadBatch = fields.use_load_batch != null
        || fields.load_batch_nominal != null
        || fields.load_batch_formation != null
        || fields.load_batch_material_preset != null;

      let nextPayload = { ...p, calibracao: { ...p.calibracao, pontos } };
      if (touchesLoadBatch && pointNumber >= 2) {
        nextPayload = syncRepeatabilityFromPanelPoint(nextPayload, pointNumber, merged);
      }
      return nextPayload;
    });
  };

  const onVersoChange = (nextPayload) => {
    setPayload((p) => {
      const merged = { ...p, ...nextPayload, verso: nextPayload.verso ?? p.verso };
      const repSnap = merged.verso?.repetitividade;
      const pontos = syncColetaPontosFromRepeatability(
        merged.calibracao?.pontos ?? p.calibracao.pontos,
        repSnap,
        merged.balanca ?? p.balanca,
      );
      return {
        ...merged,
        calibracao: { ...(merged.calibracao || p.calibracao), pontos },
      };
    });
  };

  const persistManualScale = async () => {
    const balanca = {
      ...payload.balanca,
      portaria_inmetro: legalMetrology ? (payload.balanca.portaria_inmetro || "aplicável") : payload.balanca.portaria_inmetro,
    };
    setSavingScale(true);
    try {
      const saved = await createScaleRegistrationFromBalance({
        tenantId,
        endCustomerId,
        balanca,
        legalMetrology,
      });
      setScales((prev) => [...prev, saved]);
      setScaleId(saved.id);
      setRegisterScaleForFuture(false);
      toast.success("Balança cadastrada e vinculada ao cliente");
      return saved.id;
    } catch (e) {
      toast.error(e.message || "Falha ao cadastrar balança");
      return null;
    } finally {
      setSavingScale(false);
    }
  };

  const handleSubmit = async () => {
    const customer = endCustomers.find((c) => c.id === endCustomerId);
    const executor = employees.find((e) => e.id === executorId);
    const balanca = {
      ...payload.balanca,
      portaria_inmetro: legalMetrology ? (payload.balanca.portaria_inmetro || "aplicável") : payload.balanca.portaria_inmetro,
    };

    let registrationId = scaleId || null;
    if (!registrationId && registerScaleForFuture) {
      registrationId = await persistManualScale();
      if (!registrationId) return;
    }

    onSubmit({
      certificateType: certType,
      payload: {
        ...payload,
        balanca,
        controle: {
          ...payload.controle,
          data_calibracao: calibrationDate,
          nome_executor: executor?.full_name || "",
        },
      },
      endCustomerId: endCustomerId || null,
      clientName: customer?.name || payload.cliente.cliente,
      scaleSerial: payload.balanca.serie,
      scaleRegistrationId: registrationId,
      calibrationDate,
      executorId: executorId || null,
      executorName: executor?.full_name || "",
      calibrationLocation: payload.balanca.local || customer?.full_address || "",
      legalMetrologyApplicable: legalMetrology,
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 space-y-4">
          <h3 className="text-sm font-semibold">Cliente e instrumento</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>Cliente</Label>
              <select value={endCustomerId} onChange={(e) => setEndCustomerId(e.target.value)} className="w-full border rounded-md h-10 px-2 text-sm mt-1">
                <option value="">— Selecionar —</option>
                {endCustomers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <Label>Balança (cadastro)</Label>
              <select
                value={scaleId}
                onChange={(e) => {
                  setScaleId(e.target.value);
                  if (!e.target.value) setRegisterScaleForFuture(false);
                }}
                className="w-full border rounded-md h-10 px-2 text-sm mt-1"
              >
                <option value="">— Preencher manualmente —</option>
                {scalesForCustomer.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.serial_number || s.tag || s.identification_code || "Sem série"} — {s.manufacturer} {s.model}
                  </option>
                ))}
              </select>
              {!scales.length && (
                <p className="text-xs text-amber-700 mt-1">Nenhuma balança cadastrada. Preencha os campos abaixo ou cadastre em Cadastros → Balanças.</p>
              )}
            </div>
            <div><Label>Data calibração</Label><Input type="date" value={calibrationDate} onChange={(e) => setCalibrationDate(e.target.value)} className="mt-1" /></div>
            <div>
              <Label>Executor</Label>
              <select value={executorId} onChange={(e) => setExecutorId(e.target.value)} className="w-full border rounded-md h-10 px-2 text-sm mt-1">
                <option value="">— Selecionar —</option>
                {employees.map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
              </select>
            </div>
          </div>

          {isManualBalance && (
            <div className="pt-3 border-t border-slate-100 space-y-3">
              <p className="text-sm font-semibold text-slate-800">Dados da balança (preenchimento manual)</p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[
                  ["Fabricante", "fabricante"],
                  ["Modelo", "modelo"],
                  ["Nº de série", "serie"],
                  ["Tag / Código interno", "tag"],
                  ["Local da calibração", "local"],
                  ["Etiqueta IPEM", "etiqueta_ipem"],
                  ["Portaria INMETRO", "portaria_inmetro"],
                ].map(([lbl, key]) => (
                  <div key={key}>
                    <Label className="text-xs">{lbl}</Label>
                    <Input
                      value={payload.balanca[key] || ""}
                      onChange={(e) => setBalanca(key, e.target.value)}
                      className="mt-1 h-9"
                    />
                  </div>
                ))}
              </div>
              <ScaleIndicationRangesFields
                variant="balance"
                values={payload.balanca}
                unit={payload.balanca.unidade || "g"}
                includeVerificationDivision={false}
                onChange={(key, value) => setBalanca(key, value)}
              />
              <div className="max-w-[12rem]">
                <Label className="text-xs">Unidade</Label>
                <select
                  value={payload.balanca.unidade || "g"}
                  onChange={(e) => setBalanca("unidade", e.target.value)}
                  className="w-full border rounded-md h-9 px-2 text-sm mt-1"
                >
                  {UNIDADE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Tipo de balança</Label>
                  <select
                    value={payload.balanca.tipo_balanca || ""}
                    onChange={(e) => setBalanca("tipo_balanca", e.target.value)}
                    className="w-full border rounded-md h-9 px-2 text-sm mt-1"
                  >
                    <option value="">—</option>
                    {TIPO_BALANCA_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <Label className="text-xs">Tipo de plataforma</Label>
                  <select
                    value={payload.balanca.tipo_plataforma || ""}
                    onChange={(e) => setBalanca("tipo_plataforma", e.target.value)}
                    className="w-full border rounded-md h-9 px-2 text-sm mt-1"
                  >
                    <option value="">—</option>
                    {TIPO_PLATAFORMA_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
                <p className="text-xs font-semibold text-slate-700 mb-2">
                  Tolerância máxima por valor de pesagem
                </p>
                <PointMaxToleranceFields
                  tolerances={payload.balanca.point_max_tolerances || []}
                  unit={payload.balanca.unidade || "g"}
                  onChange={(next) => setBalanca("point_max_tolerances", next)}
                />
              </div>

              {endCustomerId ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3 space-y-3">
                  <label className="flex items-start gap-2 cursor-pointer text-sm text-slate-700">
                    <Checkbox
                      checked={registerScaleForFuture}
                      onCheckedChange={(v) => setRegisterScaleForFuture(Boolean(v))}
                      className="mt-0.5"
                    />
                    <span>
                      Cadastrar esta balança no cadastro do cliente para uso futuro
                      <span className="block text-xs text-slate-500 mt-0.5">
                        Ao criar o certificado, a balança ficará disponível na lista de cadastro deste cliente.
                      </span>
                    </span>
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={savingScale || submitting}
                    onClick={persistManualScale}
                  >
                    <FloppyDisk size={16} className="mr-1.5" />
                    {savingScale ? "A cadastrar…" : "Cadastrar balança agora"}
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-amber-700">Selecione um cliente para poder cadastrar a balança para uso futuro.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-3">
          <h3 className="text-sm font-semibold">Condições ambientais</h3>
          <div className="grid sm:grid-cols-3 gap-3">
            <div><Label className="text-xs">Temp. inicial</Label><Input value={payload.ambiente.temp_inicial} onChange={(e) => setAmbiente("temp_inicial", e.target.value)} /></div>
            <div><Label className="text-xs">Temp. final</Label><Input value={payload.ambiente.temp_final} onChange={(e) => setAmbiente("temp_final", e.target.value)} /></div>
            <div><Label className="text-xs">Massa específica do ar (calculada)</Label><Input readOnly className="bg-slate-50" value={`${formatAirDensityDisplay(calculatedAirDensity.valid ? calculatedAirDensity.value : null)} kg/m³`} /></div>
            <div><Label className="text-xs">UR inicial</Label><Input value={payload.ambiente.umidade_inicial} onChange={(e) => setAmbiente("umidade_inicial", e.target.value)} /></div>
            <div><Label className="text-xs">UR final</Label><Input value={payload.ambiente.umidade_final} onChange={(e) => setAmbiente("umidade_final", e.target.value)} /></div>
            <div>
              <Label className="text-xs">Termo-baro 1</Label>
              <select value={payload.ambiente.thermo_cert_id || ""} onChange={(e) => setAmbiente("thermo_cert_id", e.target.value)} className="w-full border rounded-md h-9 px-2 text-sm">
                <option value="">—</option>
                {envCerts.map((e) => <option key={e.id} value={e.id}>{e.equipment_name}</option>)}
              </select>
            </div>
            <div><Label className="text-xs">Pressão inicial</Label><Input value={payload.ambiente.pressao_inicial} onChange={(e) => setAmbiente("pressao_inicial", e.target.value)} /></div>
            <div><Label className="text-xs">Pressão final</Label><Input value={payload.ambiente.pressao_final} onChange={(e) => setAmbiente("pressao_final", e.target.value)} /></div>
            <div>
              <Label className="text-xs">Termo-baro 2</Label>
              <select value={payload.ambiente.thermo_cert_id_2 || ""} onChange={(e) => setAmbiente("thermo_cert_id_2", e.target.value)} className="w-full border rounded-md h-9 px-2 text-sm">
                <option value="">—</option>
                {envCerts.map((e) => <option key={e.id} value={e.id}>{e.equipment_name}</option>)}
              </select>
            </div>
          </div>
          <TbhCorrectionPanel
            mode="coleta"
            ambiente={payload.ambiente}
            envCerts={envCerts}
            onAmbienteChange={(ambiente) => setPayload((p) => ({ ...p, ambiente }))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-3">
          <ColetaVersoForm
            payload={payload}
            onChange={onVersoChange}
            defaultUnit={defaultUnit}
          />
          <p className="text-xs text-slate-500">
            A linha <strong>L1 + P1</strong> no verso corresponde ao lote de carga do <strong>P2</strong> (formação <code className="text-xs">l1_p1</code>).
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-3">
          <h3 className="text-sm font-semibold">Ensaio de excentricidade</h3>
          <EccentricityTestFields
            excentricidade={payload.excentricidade}
            tipoPlataforma={payload.balanca.tipo_plataforma || ""}
            defaultUnit={defaultUnit}
            onChange={setExcentricidade}
            disabled={submitting}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <PointRegistrationPanel
            points={panelPoints}
            weightItems={weightItems}
            weightCerts={weightCerts}
            legalMetrologyApplicable={legalMetrology}
            onLegalMetrologyChange={setLegalMetrology}
            onPointChange={onPointChange}
            unit={defaultUnit}
          />
        </CardContent>
      </Card>

      <Button onClick={handleSubmit} disabled={submitting} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700">
        {submitting ? "A criar certificado…" : "Criar certificado manual"}
      </Button>
    </div>
  );
}
