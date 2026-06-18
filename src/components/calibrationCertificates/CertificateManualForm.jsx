import React, { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { emptyColetaPayload, nominalFromWeightIds } from "@/lib/coletaSchema";
import { balanceSnapshotFromScaleRegistration } from "@/lib/scaleRegistrations/scaleRegistrationUtils";
import PesoPadraoMultiSelect from "@/components/coleta/PesoPadraoMultiSelect";

const POINT_COUNT = 7;

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default function CertificateManualForm({ tenantId, certType, onSubmit, submitting }) {
  const [endCustomers, setEndCustomers] = useState([]);
  const [scales, setScales] = useState([]);
  const [weightItems, setWeightItems] = useState([]);
  const [envCerts, setEnvCerts] = useState([]);
  const [employees, setEmployees] = useState([]);

  const [endCustomerId, setEndCustomerId] = useState("");
  const [scaleId, setScaleId] = useState("");
  const [calibrationDate, setCalibrationDate] = useState(todayIso());
  const [executorId, setExecutorId] = useState("");
  const [payload, setPayload] = useState(() => {
    const p = emptyColetaPayload();
    p.calibracao.pontos = p.calibracao.pontos.slice(0, POINT_COUNT);
    return p;
  });

  const load = useCallback(async () => {
    if (!tenantId) return;
    const [c, s, w, e, em] = await Promise.all([
      supabase.from("end_customer_registrations").select("*").eq("tenant_id", tenantId).order("name"),
      supabase.from("scale_registrations").select("*").eq("tenant_id", tenantId).eq("active", true).order("serial_number"),
      supabase.from("standard_weight_items").select("*").eq("tenant_id", tenantId).eq("active", true).order("identification"),
      supabase.from("environment_sensor_certificates").select("*").eq("tenant_id", tenantId).order("equipment_name"),
      supabase.from("employee_registrations").select("*").eq("tenant_id", tenantId).order("full_name"),
    ]);
    if (!c.error) setEndCustomers(c.data || []);
    if (!s.error) setScales(s.data || []);
    if (!w.error) setWeightItems(w.data || []);
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
  }, [scaleId, scales]);

  const setAmbiente = (k, v) => setPayload((p) => ({ ...p, ambiente: { ...p.ambiente, [k]: v } }));
  const setControle = (k, v) => setPayload((p) => ({ ...p, controle: { ...p.controle, [k]: v } }));

  const setPoint = (idx, k, v) => {
    setPayload((p) => {
      const pontos = [...p.calibracao.pontos];
      pontos[idx] = { ...pontos[idx], [k]: v };
      return { ...p, calibracao: { ...p.calibracao, pontos } };
    });
  };

  const setPointPesos = (idx, ids) => {
    const nominal = nominalFromWeightIds(ids, weightItems, true);
    setPayload((p) => {
      const pontos = [...p.calibracao.pontos];
      pontos[idx] = {
        ...pontos[idx],
        pesos_padrao_ids: ids,
        peso_nominal: nominal || pontos[idx].peso_nominal,
      };
      return { ...p, calibracao: { ...p.calibracao, pontos } };
    });
  };

  const handleSubmit = () => {
    const customer = endCustomers.find((c) => c.id === endCustomerId);
    const executor = employees.find((e) => e.id === executorId);
    setControle("data_calibracao", calibrationDate);
    setControle("nome_executor", executor?.full_name || "");
    onSubmit({
      certificateType: certType,
      payload: { ...payload, controle: { ...payload.controle, data_calibracao: calibrationDate, nome_executor: executor?.full_name || "" } },
      endCustomerId: endCustomerId || null,
      clientName: customer?.name || payload.cliente.cliente,
      scaleSerial: payload.balanca.serie,
      scaleRegistrationId: scaleId || null,
      calibrationDate,
      executorId: executorId || null,
      executorName: executor?.full_name || "",
      calibrationLocation: payload.balanca.local || customer?.full_address || "",
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
              <select value={scaleId} onChange={(e) => setScaleId(e.target.value)} className="w-full border rounded-md h-10 px-2 text-sm mt-1">
                <option value="">— Manual —</option>
                {scales.map((s) => <option key={s.id} value={s.id}>{s.serial_number} — {s.manufacturer} {s.model}</option>)}
              </select>
            </div>
            <div><Label>Nº série</Label><Input value={payload.balanca.serie} onChange={(e) => setPayload((p) => ({ ...p, balanca: { ...p.balanca, serie: e.target.value } }))} className="mt-1" /></div>
            <div><Label>Data calibração</Label><Input type="date" value={calibrationDate} onChange={(e) => setCalibrationDate(e.target.value)} className="mt-1" /></div>
            <div>
              <Label>Executor</Label>
              <select value={executorId} onChange={(e) => setExecutorId(e.target.value)} className="w-full border rounded-md h-10 px-2 text-sm mt-1">
                <option value="">— Selecionar —</option>
                {employees.map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
              </select>
            </div>
            <div><Label>Local</Label><Input value={payload.balanca.local} onChange={(e) => setPayload((p) => ({ ...p, balanca: { ...p.balanca, local: e.target.value } }))} className="mt-1" /></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-3">
          <h3 className="text-sm font-semibold">Condições ambientais</h3>
          <div className="grid sm:grid-cols-3 gap-3">
            <div><Label className="text-xs">Temp. inicial</Label><Input value={payload.ambiente.temp_inicial} onChange={(e) => setAmbiente("temp_inicial", e.target.value)} /></div>
            <div><Label className="text-xs">Temp. final</Label><Input value={payload.ambiente.temp_final} onChange={(e) => setAmbiente("temp_final", e.target.value)} /></div>
            <div><Label className="text-xs">Massa específica ar</Label><Input value={payload.ambiente.massa_especifica || ""} onChange={(e) => setAmbiente("massa_especifica", e.target.value)} /></div>
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
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-3">
          <h3 className="text-sm font-semibold">Pontos de calibração (até {POINT_COUNT})</h3>
          {payload.calibracao.pontos.map((pt, i) => (
            <div key={i} className="border rounded-lg p-3 space-y-2">
              <p className="text-xs font-semibold text-slate-600">Ponto {i + 1}</p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
                <div><Label className="text-xs">V.R.</Label><Input value={pt.peso_nominal} onChange={(e) => setPoint(i, "peso_nominal", e.target.value)} className="h-9" /></div>
                <div><Label className="text-xs">Antes ajuste</Label><Input value={pt.leitura_antes} onChange={(e) => setPoint(i, "leitura_antes", e.target.value)} className="h-9" /></div>
                <div><Label className="text-xs">Leitura 1</Label><Input value={pt.rep1} onChange={(e) => setPoint(i, "rep1", e.target.value)} className="h-9" /></div>
                <div><Label className="text-xs">Leitura 2</Label><Input value={pt.rep2} onChange={(e) => setPoint(i, "rep2", e.target.value)} className="h-9" /></div>
                <div><Label className="text-xs">Leitura 3</Label><Input value={pt.rep3} onChange={(e) => setPoint(i, "rep3", e.target.value)} className="h-9" /></div>
                <div className="sm:col-span-2">
                  <Label className="text-xs">Pesos padrão</Label>
                  <PesoPadraoMultiSelect weightItems={weightItems} value={pt.pesos_padrao_ids || []} onChange={(ids) => setPointPesos(i, ids)} />
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Button onClick={handleSubmit} disabled={submitting} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700">
        {submitting ? "A criar certificado…" : "Criar certificado manual"}
      </Button>
    </div>
  );
}
