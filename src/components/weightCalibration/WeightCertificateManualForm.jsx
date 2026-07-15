import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { FloppyDisk, Plus, Trash } from "@phosphor-icons/react";
import { toast } from "sonner";
import {
  emptyWeightColetaPayload,
  emptyWeightItem,
  MAX_WEIGHT_ITEMS,
  END_CUSTOMER_LOOKUP_SELECT,
  applyEndCustomerToWeightCliente,
  normalizeWeightAmbiente,
  validateWeightCalcPayload,
} from "@/lib/weightCalibration/weightColetaSchema";
import { WEIGHT_CLASSES, MATERIALS } from "@/lib/weightCalibration/weightCertificateSchema";
import { cadastroSectionPath } from "@/lib/cadastroSections";
import WeightAmbientSection from "@/components/weightCalibration/WeightAmbientSection";
import StandardWeightPickerPanel from "@/components/shared/StandardWeightPickerPanel";

const fieldClass = "h-9 text-sm";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Formulário manual enxuto (shape emptyWeightColetaPayload).
 * onSubmit(payloadExtras) — parent chama createWeightCertificateManual.
 */
export default function WeightCertificateManualForm({
  tenantId,
  certType,
  onSubmit,
  submitting,
}) {
  const [endCustomers, setEndCustomers] = useState([]);
  const [weightItems, setWeightItems] = useState([]);
  const [weightCerts, setWeightCerts] = useState([]);
  const [envCerts, setEnvCerts] = useState([]);
  const [endCustomerId, setEndCustomerId] = useState("");
  const [payload, setPayload] = useState(() => {
    const p = emptyWeightColetaPayload();
    p.geral.data_calibracao = todayIso();
    p.itens = [emptyWeightItem(), emptyWeightItem()];
    return p;
  });

  const load = useCallback(async () => {
    if (!tenantId) return;
    const [c, w, wc, env] = await Promise.all([
      supabase
        .from("end_customer_registrations")
        .select(END_CUSTOMER_LOOKUP_SELECT)
        .eq("tenant_id", tenantId)
        .order("name"),
      supabase
        .from("standard_weight_items")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("active", true)
        .order("identification"),
      supabase
        .from("weight_standard_certificates")
        .select("*")
        .eq("tenant_id", tenantId),
      supabase
        .from("environment_sensor_certificates")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("equipment_name"),
    ]);
    if (c.error) {
      toast.error(`Falha ao carregar clientes: ${c.error.message}`);
    } else {
      setEndCustomers(c.data || []);
    }
    if (!w.error) setWeightItems(w.data || []);
    if (!wc.error) setWeightCerts(wc.data || []);
    if (env.error) {
      toast.error(`Falha ao carregar TBH: ${env.error.message}`);
    } else {
      setEnvCerts(env.data || []);
    }
  }, [tenantId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!endCustomerId) return;
    const c = endCustomers.find((x) => x.id === endCustomerId);
    if (!c) return;
    setPayload((p) => ({
      ...p,
      cliente: applyEndCustomerToWeightCliente(p.cliente, c),
    }));
  }, [endCustomerId, endCustomers]);

  const customers = useMemo(
    () => [...endCustomers].sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "pt")),
    [endCustomers],
  );

  const setCliente = (k, v) => setPayload((p) => ({ ...p, cliente: { ...p.cliente, [k]: v } }));
  const setGeral = (k, v) => setPayload((p) => ({ ...p, geral: { ...p.geral, [k]: v } }));

  const onAmbienteChange = (ambiente) => {
    setPayload((p) => {
      const next = { ...p, ambiente: normalizeWeightAmbiente(ambiente) };
      const ids = [ambiente.thermo_cert_id, ambiente.thermo_cert_id_2].filter(Boolean);
      if (ids.length) {
        next.rastreabilidade = {
          ...p.rastreabilidade,
          tbh: ids.map((id) => {
            const cert = envCerts.find((e) => e.id === id);
            return {
              identificacao: cert?.equipment_name || "",
              certificado: cert?.certificate_number || "",
              validade: cert?.expiry_date || "",
              laboratorio: cert?.calibrated_by || "",
              standard_id: id,
            };
          }),
        };
      }
      return next;
    });
  };

  const updateItem = (idx, patch) => {
    setPayload((p) => {
      const itens = [...(p.itens || [])];
      itens[idx] = { ...itens[idx], ...patch };
      return { ...p, itens };
    });
  };

  const applyReference = (idx, refId) => {
    if (!refId || refId === "__none") {
      updateItem(idx, {
        reference_standard_id: null,
        reference_identification: "",
        reference_conventional_value: "",
        reference_uncertainty: "",
      });
      return;
    }
    const ref = weightItems.find((w) => w.id === refId);
    if (!ref) return;
    updateItem(idx, {
      reference_standard_id: ref.id,
      reference_identification: ref.identification || "",
      reference_conventional_value: ref.conventional_value || "",
      reference_uncertainty: ref.expanded_uncertainty || "",
      reference_material: ref.material || ref.material_preset || "",
      nominal_unit: ref.unit || "g",
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!payload.cliente?.solicitante?.trim()) {
      toast.error("Informe o solicitante");
      return;
    }
    const check = validateWeightCalcPayload(payload);
    if (!check.ok) {
      toast.error(check.message);
      return;
    }
    onSubmit?.({
      payload,
      certificateType: certType,
      endCustomerId: endCustomerId || null,
      calibrationDate: payload.geral?.data_calibracao || todayIso(),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <Label className="text-sm font-medium">Cliente (cadastro)</Label>
        {customers.length === 0 ? (
          <p className="text-sm text-slate-600 mt-1">
            Nenhum cliente cadastrado.{" "}
            <Link to={cadastroSectionPath("clientes")} className="text-blue-600 hover:underline">
              PR-7.1 → Clientes
            </Link>
          </p>
        ) : (
          <>
            <select
              value={endCustomerId}
              onChange={(e) => setEndCustomerId(e.target.value)}
              className="w-full border rounded-md h-10 px-3 text-sm bg-white mt-1"
            >
              <option value="">— Selecionar para preencher automaticamente —</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500 mt-1">
              Novos clientes em{" "}
              <Link to={cadastroSectionPath("clientes")} className="text-blue-600 hover:underline">
                PR-7.1 → Clientes
              </Link>
            </p>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label className="text-[11px]">Solicitante *</Label>
          <Input
            className={fieldClass}
            required
            value={payload.cliente?.solicitante || ""}
            onChange={(e) => setCliente("solicitante", e.target.value)}
          />
        </div>
        <div>
          <Label className="text-[11px]">Responsável</Label>
          <Input
            className={fieldClass}
            value={payload.cliente?.responsavel || ""}
            onChange={(e) => setCliente("responsavel", e.target.value)}
          />
        </div>
        <div>
          <Label className="text-[11px]">Data de calibração</Label>
          <Input
            type="date"
            className={fieldClass}
            value={payload.geral?.data_calibracao || ""}
            onChange={(e) => setGeral("data_calibracao", e.target.value)}
          />
        </div>
        <div>
          <Label className="text-[11px]">Identificação / tag</Label>
          <Input
            className={fieldClass}
            value={payload.geral?.identificacao || ""}
            onChange={(e) => setGeral("identificacao", e.target.value)}
          />
        </div>
        <div>
          <Label className="text-[11px]">Classe</Label>
          <Select value={payload.geral?.classe || "__"} onValueChange={(v) => setGeral("classe", v === "__" ? "" : v)}>
            <SelectTrigger className={fieldClass}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__">—</SelectItem>
              {WEIGHT_CLASSES.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[11px]">Série</Label>
          <Input
            className={fieldClass}
            value={payload.geral?.serie || ""}
            onChange={(e) => setGeral("serie", e.target.value)}
          />
        </div>
        <div>
          <Label className="text-[11px]">Fabricante</Label>
          <Input
            className={fieldClass}
            value={payload.geral?.fabricante || ""}
            onChange={(e) => setGeral("fabricante", e.target.value)}
          />
        </div>
        <div>
          <Label className="text-[11px]">Processo / proposta</Label>
          <Input
            className={fieldClass}
            value={payload.geral?.processo_numero || ""}
            onChange={(e) => setGeral("processo_numero", e.target.value)}
          />
        </div>
        <div>
          <Label className="text-[11px]">Executor(es)</Label>
          <Input
            className={fieldClass}
            value={payload.executores || ""}
            onChange={(e) => setPayload((p) => ({ ...p, executores: e.target.value }))}
          />
        </div>
      </div>

      <div className="rounded-lg border p-4">
        <WeightAmbientSection
          ambiente={payload.ambiente}
          envCerts={envCerts}
          onAmbienteChange={onAmbienteChange}
          fieldClass={fieldClass}
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Itens</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={(payload.itens || []).length >= MAX_WEIGHT_ITEMS}
            onClick={() => setPayload((p) => ({ ...p, itens: [...(p.itens || []), emptyWeightItem()] }))}
          >
            <Plus size={14} className="mr-1" /> Item
          </Button>
        </div>

        {(payload.itens || []).map((item, idx) => (
          <div key={idx} className="border rounded-lg p-3 space-y-2 bg-slate-50/40">
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-500">Item {idx + 1}</span>
              {(payload.itens || []).length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-red-600"
                  onClick={() => setPayload((p) => ({
                    ...p,
                    itens: p.itens.filter((_, i) => i !== idx),
                  }))}
                >
                  <Trash size={14} />
                </Button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <Label className="text-[11px]">Identificação</Label>
                <Input className={fieldClass} value={item.identification || ""} onChange={(e) => updateItem(idx, { identification: e.target.value })} />
              </div>
              <div>
                <Label className="text-[11px]">Nominal</Label>
                <Input className={fieldClass} value={item.nominal_value || ""} onChange={(e) => updateItem(idx, { nominal_value: e.target.value })} />
              </div>
              <div>
                <Label className="text-[11px]">Unidade</Label>
                <Select value={item.nominal_unit || "g"} onValueChange={(v) => updateItem(idx, { nominal_unit: v })}>
                  <SelectTrigger className={fieldClass}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["mg", "g", "kg"].map((u) => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[11px]">Classe</Label>
                <Select value={item.uut_class || "__"} onValueChange={(v) => updateItem(idx, { uut_class: v === "__" ? "" : v })}>
                  <SelectTrigger className={fieldClass}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__">—</SelectItem>
                    {WEIGHT_CLASSES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[11px]">Material UUT</Label>
                <Select value={item.uut_material || "__"} onValueChange={(v) => updateItem(idx, { uut_material: v === "__" ? "" : v })}>
                  <SelectTrigger className={fieldClass}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__">—</SelectItem>
                    {MATERIALS.map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-3 space-y-2">
                <Label className="text-[11px]">Referência (cadastro)</Label>
                <StandardWeightPickerPanel
                  weightItems={weightItems}
                  weightCerts={weightCerts}
                  value={item.reference_standard_id ? [item.reference_standard_id] : []}
                  onChange={(ids) => applyReference(idx, ids[0] || "__none")}
                  unit={item.nominal_unit || "g"}
                  compact
                  itemKind="weights"
                  singleSelect
                  emptyMessage="Cadastre pesos padrão em PR-6.4 → Peso Padrão."
                />
              </div>
              <div>
                <Label className="text-[11px]">VVC ref.</Label>
                <Input className={fieldClass} value={item.reference_conventional_value || ""} onChange={(e) => updateItem(idx, { reference_conventional_value: e.target.value })} />
              </div>
              <div>
                <Label className="text-[11px]">Ue ref.</Label>
                <Input className={fieldClass} value={item.reference_uncertainty || ""} onChange={(e) => updateItem(idx, { reference_uncertainty: e.target.value })} />
              </div>
              <div>
                <Label className="text-[11px]">Resolução</Label>
                <Input className={fieldClass} value={item.balance_resolution || ""} onChange={(e) => updateItem(idx, { balance_resolution: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Ciclos (padrão / medição)</Label>
              {(item.cycles || []).slice(0, item.cycle_count || 3).map((c, ci) => (
                <div key={ci} className="grid grid-cols-2 gap-2">
                  <Input
                    className={fieldClass}
                    placeholder={`Padrão ${ci + 1}`}
                    value={c.standard_reading || ""}
                    onChange={(e) => {
                      const cycles = [...(item.cycles || [])];
                      cycles[ci] = { ...cycles[ci], standard_reading: e.target.value };
                      updateItem(idx, { cycles });
                    }}
                  />
                  <Input
                    className={fieldClass}
                    placeholder={`Medição ${ci + 1}`}
                    value={c.measuring_reading || ""}
                    onChange={(e) => {
                      const cycles = [...(item.cycles || [])];
                      cycles[ci] = { ...cycles[ci], measuring_reading: e.target.value };
                      updateItem(idx, { cycles });
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Button type="submit" disabled={submitting} className="bg-blue-600 hover:bg-blue-700">
        <FloppyDisk size={18} className="mr-1" />
        {submitting ? "A criar…" : "Criar certificado"}
      </Button>
    </form>
  );
}
