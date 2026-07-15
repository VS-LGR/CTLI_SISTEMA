import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate, useLocation, useNavigate, useOutletContext, useParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { isSupabaseAuthMode } from "@/lib/api";
import { canAccessColeta, canAccessCalibrationCertificates } from "@/lib/roles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, FloppyDisk, Plus, Trash, CaretDown, CaretUp, Certificate } from "@phosphor-icons/react";
import { toast } from "sonner";
import {
  emptyWeightColetaPayload,
  emptyWeightItem,
  MAX_WEIGHT_ITEMS,
  END_CUSTOMER_LOOKUP_SELECT,
  applyEndCustomerToWeightCliente,
  resolveWeightEndCustomerId,
  normalizeWeightAmbiente,
  validateWeightCalcPayload,
} from "@/lib/weightCalibration/weightColetaSchema";
import { cadastroSectionPath } from "@/lib/cadastroSections";
import WeightAmbientSection from "@/components/weightCalibration/WeightAmbientSection";
import StandardWeightPickerPanel from "@/components/shared/StandardWeightPickerPanel";
import {
  WEIGHT_COLETA_LIST_PATH,
  WEIGHT_COLETA_NEW_PATH,
} from "@/lib/weightCalibration/weightColetaRoutes";
import { weightCertificateEditorPath } from "@/lib/weightCalibration/weightCertificateRoutes";
import {
  getWeightColeta,
  saveWeightColeta,
  updateWeightColetaWorkflow,
} from "@/lib/weightCalibration/weightColetaApi";
import { createWeightCertificateFromColeta } from "@/lib/weightCalibration/weightCertificateApi";
import {
  WEIGHT_CLASSES,
  MATERIALS,
  CERTIFICATE_TYPES,
  canColetaGenerateOfficial,
  COLETA_WORKFLOW_STATUSES,
} from "@/lib/weightCalibration/weightCertificateSchema";

function emptyTraceRow() {
  return { identificacao: "", certificado: "", validade: "", laboratorio: "" };
}

function resizeCycles(cycles, count) {
  const n = Math.max(1, Math.min(10, Number(count) || 3));
  const next = Array.isArray(cycles) ? [...cycles] : [];
  while (next.length < n) next.push({ standard_reading: "", measuring_reading: "" });
  return next.slice(0, n);
}

function mergePayload(raw) {
  const base = emptyWeightColetaPayload();
  if (!raw || typeof raw !== "object") return base;
  return {
    ...base,
    ...raw,
    cliente: { ...base.cliente, ...(raw.cliente || {}) },
    geral: { ...base.geral, ...(raw.geral || {}) },
    ambiente: normalizeWeightAmbiente({ ...base.ambiente, ...(raw.ambiente || {}) }),
    rastreabilidade: {
      balancas: raw.rastreabilidade?.balancas || [],
      conjuntos_peso: raw.rastreabilidade?.conjuntos_peso || [],
      tbh: raw.rastreabilidade?.tbh || [],
    },
    peso_descricoes: Array.isArray(raw.peso_descricoes)
      ? [...raw.peso_descricoes, "", "", "", ""].slice(0, 4)
      : base.peso_descricoes,
    itens: Array.isArray(raw.itens) && raw.itens.length
      ? raw.itens.map((it) => emptyWeightItem(it))
      : base.itens,
  };
}

const fieldClass = "h-9 text-sm";

function TraceRows({ title, rows, onChange }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-sm font-medium">{title}</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange([...(rows || []), emptyTraceRow()])}
        >
          <Plus size={14} className="mr-1" /> Adicionar
        </Button>
      </div>
      {(rows || []).length === 0 ? (
        <p className="text-xs text-slate-500">Nenhum registo.</p>
      ) : (
        <div className="space-y-2">
          {(rows || []).map((row, idx) => (
            <div key={idx} className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-end border rounded-lg p-2 bg-slate-50/50">
              <div>
                <Label className="text-[11px]">Identificação</Label>
                <Input
                  className={fieldClass}
                  value={row.identificacao || ""}
                  onChange={(e) => {
                    const next = [...rows];
                    next[idx] = { ...next[idx], identificacao: e.target.value };
                    onChange(next);
                  }}
                />
              </div>
              <div>
                <Label className="text-[11px]">Certificado</Label>
                <Input
                  className={fieldClass}
                  value={row.certificado || ""}
                  onChange={(e) => {
                    const next = [...rows];
                    next[idx] = { ...next[idx], certificado: e.target.value };
                    onChange(next);
                  }}
                />
              </div>
              <div>
                <Label className="text-[11px]">Validade</Label>
                <Input
                  type="date"
                  className={fieldClass}
                  value={row.validade || ""}
                  onChange={(e) => {
                    const next = [...rows];
                    next[idx] = { ...next[idx], validade: e.target.value };
                    onChange(next);
                  }}
                />
              </div>
              <div>
                <Label className="text-[11px]">Laboratório</Label>
                <Input
                  className={fieldClass}
                  value={row.laboratorio || ""}
                  onChange={(e) => {
                    const next = [...rows];
                    next[idx] = { ...next[idx], laboratorio: e.target.value };
                    onChange(next);
                  }}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-red-600 justify-self-start sm:justify-self-end"
                onClick={() => onChange(rows.filter((_, i) => i !== idx))}
              >
                <Trash size={14} />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function WeightItemCard({
  index,
  item,
  expanded,
  onToggle,
  onChange,
  onRemove,
  weightItems,
  weightCerts = [],
}) {
  const set = (patch) => onChange({ ...item, ...patch });

  const applyReference = (refId) => {
    if (!refId || refId === "__none") {
      set({
        reference_standard_id: null,
        reference_identification: "",
        reference_conventional_value: "",
        reference_uncertainty: "",
        reference_material: "",
      });
      return;
    }
    const ref = weightItems.find((w) => w.id === refId);
    if (!ref) return;
    set({
      reference_standard_id: ref.id,
      reference_identification: ref.identification || "",
      reference_conventional_value: ref.conventional_value || "",
      reference_uncertainty: ref.expanded_uncertainty || "",
      reference_material: ref.material || ref.material_preset || "",
      nominal_unit: ref.unit || item.nominal_unit || "g",
    });
  };

  return (
    <Card className="border-slate-200">
      <CardContent className="p-3 sm:p-4 space-y-3">
        <button
          type="button"
          className="w-full flex items-center justify-between gap-2 text-left"
          onClick={onToggle}
        >
          <div className="min-w-0">
            <span className="text-xs text-slate-500 mr-2">Item {index + 1}</span>
            <span className="font-medium text-sm text-slate-900">
              {item.identification || "Sem identificação"}
            </span>
            {item.nominal_value && (
              <span className="text-xs text-slate-500 ml-2">
                {item.nominal_value} {item.nominal_unit || "g"}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-red-600"
              onClick={(e) => { e.stopPropagation(); onRemove(); }}
            >
              <Trash size={14} />
            </Button>
            {expanded ? <CaretUp size={16} /> : <CaretDown size={16} />}
          </div>
        </button>

        {expanded && (
          <div className="space-y-3 border-t pt-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label className="text-[11px]">Identificação</Label>
                <Input className={fieldClass} value={item.identification || ""} onChange={(e) => set({ identification: e.target.value })} />
              </div>
              <div>
                <Label className="text-[11px]">Valor nominal</Label>
                <Input className={fieldClass} value={item.nominal_value || ""} onChange={(e) => set({ nominal_value: e.target.value })} />
              </div>
              <div>
                <Label className="text-[11px]">Unidade</Label>
                <Select value={item.nominal_unit || "g"} onValueChange={(v) => set({ nominal_unit: v })}>
                  <SelectTrigger className={fieldClass}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["mg", "g", "kg"].map((u) => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[11px]">Classe (UUT)</Label>
                <Select value={item.uut_class || "__"} onValueChange={(v) => set({ uut_class: v === "__" ? "" : v })}>
                  <SelectTrigger className={fieldClass}><SelectValue placeholder="Classe" /></SelectTrigger>
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
                <Select value={item.uut_material || "__"} onValueChange={(v) => set({ uut_material: v === "__" ? "" : v })}>
                  <SelectTrigger className={fieldClass}><SelectValue placeholder="Material" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__">—</SelectItem>
                    {MATERIALS.map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[11px]">Material padrão</Label>
                <Select value={item.reference_material || "__"} onValueChange={(v) => set({ reference_material: v === "__" ? "" : v })}>
                  <SelectTrigger className={fieldClass}><SelectValue placeholder="Material" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__">—</SelectItem>
                    {MATERIALS.map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[11px]">Peso de referência (cadastro)</Label>
              <StandardWeightPickerPanel
                weightItems={weightItems}
                weightCerts={weightCerts}
                value={item.reference_standard_id ? [item.reference_standard_id] : []}
                onChange={(ids) => applyReference(ids[0] || "__none")}
                unit={item.nominal_unit || "g"}
                compact
                itemKind="weights"
                singleSelect
                emptyMessage="Cadastre pesos padrão em PR-6.4 → Peso Padrão."
              />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label className="text-[11px]">Ident. referência</Label>
                  <Input className={fieldClass} value={item.reference_identification || ""} onChange={(e) => set({ reference_identification: e.target.value })} />
                </div>
                <div>
                  <Label className="text-[11px]">VVC referência</Label>
                  <Input className={fieldClass} value={item.reference_conventional_value || ""} onChange={(e) => set({ reference_conventional_value: e.target.value })} />
                </div>
                <div>
                  <Label className="text-[11px]">Ue referência</Label>
                  <Input className={fieldClass} value={item.reference_uncertainty || ""} onChange={(e) => set({ reference_uncertainty: e.target.value })} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <Label className="text-[11px]">Resolução</Label>
                <Input className={fieldClass} value={item.balance_resolution || ""} onChange={(e) => set({ balance_resolution: e.target.value })} />
              </div>
              <div>
                <Label className="text-[11px]">Casas decimais</Label>
                <Input
                  type="number"
                  className={fieldClass}
                  value={item.decimal_places ?? 2}
                  onChange={(e) => set({ decimal_places: Number(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label className="text-[11px]">Nº ciclos</Label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  className={fieldClass}
                  value={item.cycle_count ?? 3}
                  onChange={(e) => {
                    const cycle_count = Number(e.target.value) || 3;
                    set({ cycle_count, cycles: resizeCycles(item.cycles, cycle_count) });
                  }}
                />
              </div>
              <div className="flex items-end gap-2 pb-1">
                <Checkbox
                  id={`assume-${index}`}
                  checked={item.assume_class_uncertainty !== false}
                  onCheckedChange={(v) => set({ assume_class_uncertainty: Boolean(v) })}
                />
                <Label htmlFor={`assume-${index}`} className="text-[11px] leading-tight">
                  Usar incerteza de classe
                </Label>
              </div>
            </div>

            <div>
              <Label className="text-[11px] mb-1 block">Ciclos (padrão / medição)</Label>
              <div className="space-y-1">
                {(item.cycles || []).map((c, ci) => (
                  <div key={ci} className="grid grid-cols-[2rem_1fr_1fr] gap-2 items-center">
                    <span className="text-xs text-slate-500">{ci + 1}</span>
                    <Input
                      className={fieldClass}
                      placeholder="Leitura padrão"
                      value={c.standard_reading || ""}
                      onChange={(e) => {
                        const cycles = [...(item.cycles || [])];
                        cycles[ci] = { ...cycles[ci], standard_reading: e.target.value };
                        set({ cycles });
                      }}
                    />
                    <Input
                      className={fieldClass}
                      placeholder="Leitura medição"
                      value={c.measuring_reading || ""}
                      onChange={(e) => {
                        const cycles = [...(item.cycles || [])];
                        cycles[ci] = { ...cycles[ci], measuring_reading: e.target.value };
                        set({ cycles });
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id={`adj-${index}`}
                  checked={Boolean(item.was_adjusted)}
                  onCheckedChange={(v) => set({ was_adjusted: Boolean(v) })}
                />
                <Label htmlFor={`adj-${index}`} className="text-[11px]">Foi ajustado</Label>
              </div>
              {item.was_adjusted && (
                <div className="w-40">
                  <Label className="text-[11px]">Valor antes do ajuste</Label>
                  <Input
                    className={fieldClass}
                    value={item.value_before_adjustment || ""}
                    onChange={(e) => set({ value_before_adjustment: e.target.value })}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function WeightColetaEditorPage() {
  const { id } = useParams();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentTenantId } = useOutletContext();
  const isNew = id === "nova" || pathname.endsWith("/pesos/coleta/nova") || pathname === WEIGHT_COLETA_NEW_PATH;

  const [payload, setPayload] = useState(() => emptyWeightColetaPayload());
  const [workflowStatus, setWorkflowStatus] = useState("rascunho");
  const [certificateId, setCertificateId] = useState(null);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [certType, setCertType] = useState("rastreavel");
  const [endCustomers, setEndCustomers] = useState([]);
  const [weightItems, setWeightItems] = useState([]);
  const [weightCerts, setWeightCerts] = useState([]);
  const [envCerts, setEnvCerts] = useState([]);
  const [expandedItems, setExpandedItems] = useState(() => new Set([0]));

  const loadLookups = useCallback(async () => {
    if (!currentTenantId) return;
    const [c, w, wc, env] = await Promise.all([
      supabase
        .from("end_customer_registrations")
        .select(END_CUSTOMER_LOOKUP_SELECT)
        .eq("tenant_id", currentTenantId)
        .order("name"),
      supabase
        .from("standard_weight_items")
        .select("*")
        .eq("tenant_id", currentTenantId)
        .eq("active", true)
        .order("identification"),
      supabase
        .from("weight_standard_certificates")
        .select("*")
        .eq("tenant_id", currentTenantId),
      supabase
        .from("environment_sensor_certificates")
        .select("*")
        .eq("tenant_id", currentTenantId)
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
  }, [currentTenantId]);

  const load = useCallback(async () => {
    if (isNew) {
      setLoading(false);
      return;
    }
    if (!id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await getWeightColeta(id);
      if (data.tenant_id !== currentTenantId && user?.role !== "admin") {
        toast.error("Sem permissão para esta coleta");
        navigate(WEIGHT_COLETA_LIST_PATH);
        return;
      }
      setPayload(mergePayload(data.payload));
      setWorkflowStatus(data.workflow_status || "rascunho");
      setCertificateId(data.certificate_id || null);
    } catch (e) {
      toast.error(e.message);
      navigate(WEIGHT_COLETA_LIST_PATH);
    } finally {
      setLoading(false);
    }
  }, [id, isNew, currentTenantId, user?.role, navigate]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadLookups(); }, [loadLookups]);

  const setCliente = (k, v) => setPayload((p) => ({ ...p, cliente: { ...p.cliente, [k]: v } }));
  const setGeral = (k, v) => setPayload((p) => ({ ...p, geral: { ...p.geral, [k]: v } }));
  const setRastro = (group, rows) => setPayload((p) => ({
    ...p,
    rastreabilidade: { ...p.rastreabilidade, [group]: rows },
  }));

  const onAmbienteChange = (ambiente) => {
    setPayload((p) => {
      const next = { ...p, ambiente };
      // Espelha TBH selecionados na rastreabilidade (padrão da planilha PREENCHER)
      const ids = [ambiente.thermo_cert_id, ambiente.thermo_cert_id_2].filter(Boolean);
      if (ids.length) {
        const rows = ids.map((id) => {
          const cert = envCerts.find((e) => e.id === id);
          return {
            identificacao: cert?.equipment_name || "",
            certificado: cert?.certificate_number || "",
            validade: cert?.expiry_date || "",
            laboratorio: cert?.calibrated_by || "",
            standard_id: id,
          };
        });
        next.rastreabilidade = { ...p.rastreabilidade, tbh: rows };
      }
      return next;
    });
  };

  const customerOptions = useMemo(
    () => [...endCustomers].sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "pt")),
    [endCustomers],
  );

  const selectedEndCustomerId = resolveWeightEndCustomerId(payload.cliente, endCustomers);

  const applyCustomer = (custId) => {
    if (!custId) {
      setPayload((p) => ({
        ...p,
        cliente: applyEndCustomerToWeightCliente(
          { ...p.cliente, solicitante: "", responsavel: "", endereco: "", cidade: "", estado: "", unidade: "", cnpj: "" },
          null,
        ),
      }));
      return;
    }
    const c = endCustomers.find((x) => x.id === custId);
    if (!c) return;
    setPayload((p) => ({
      ...p,
      cliente: applyEndCustomerToWeightCliente(p.cliente, c),
    }));
  };

  if (!canAccessColeta(user?.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  if (!isSupabaseAuthMode || !currentTenantId) {
    return <Navigate to={WEIGHT_COLETA_LIST_PATH} replace />;
  }

  const persist = async (nextWorkflow = workflowStatus) => {
    const saved = await saveWeightColeta(currentTenantId, isNew ? null : id, {
      payload,
      workflow_status: nextWorkflow,
      userId: user.id,
    });
    return saved;
  };

  const save = async (nextWorkflow = workflowStatus) => {
    setSaving(true);
    try {
      const saved = await persist(nextWorkflow);
      setWorkflowStatus(saved.workflow_status || nextWorkflow);
      toast.success(isNew ? "Coleta criada" : "Coleta guardada");
      if (isNew) navigate(WEIGHT_COLETA_LIST_PATH);
      else if (saved.id && saved.id !== id) navigate(`/requirement/7/pr-7-2/pesos/coleta/${saved.id}`);
    } catch (e) {
      toast.error(e.message || "Falha ao guardar");
    } finally {
      setSaving(false);
    }
  };

  const markWorkflow = async (status) => {
    setSaving(true);
    try {
      if (isNew) {
        await persist(status);
        toast.success(`Coleta criada como ${status}`);
        navigate(WEIGHT_COLETA_LIST_PATH);
      } else {
        await persist(status);
        await updateWeightColetaWorkflow(id, status);
        setWorkflowStatus(status);
        toast.success(`Status: ${status}`);
      }
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const generateCertificate = async () => {
    if (!canAccessCalibrationCertificates(user?.role)) {
      return toast.error("Sem permissão para gerar certificados");
    }
    if (isNew) return toast.error("Guarde a coleta antes de gerar o certificado");
    const check = validateWeightCalcPayload(payload);
    if (!check.ok) return toast.error(check.message);
    setGenerating(true);
    try {
      await persist(workflowStatus);
      const { certificate, recalcWarning, isPreviewOnly } = await createWeightCertificateFromColeta({
        tenantId: currentTenantId,
        userId: user.id,
        collectionId: id,
        certificateType: certType,
      });
      toast.success(
        isPreviewOnly || !canColetaGenerateOfficial(workflowStatus)
          ? "Prévia técnica gerada — confira a coleta antes da emissão oficial"
          : "Certificado gerado a partir da coleta",
      );
      if (recalcWarning) toast.warning(`Cálculo automático: ${recalcWarning}`);
      navigate(weightCertificateEditorPath(certificate.id));
    } catch (e) {
      toast.error(e.message || "Falha ao gerar certificado");
    } finally {
      setGenerating(false);
    }
  };

  const addItem = () => {
    if ((payload.itens || []).length >= MAX_WEIGHT_ITEMS) {
      return toast.error(`Máximo de ${MAX_WEIGHT_ITEMS} itens`);
    }
    setPayload((p) => ({ ...p, itens: [...(p.itens || []), emptyWeightItem()] }));
    setExpandedItems((prev) => new Set([...prev, (payload.itens || []).length]));
  };

  if (loading) {
    return <p className="text-sm text-slate-500 py-12 text-center">A carregar formulário…</p>;
  }

  const showGenerate = !isNew
    && workflowStatus !== "certificado_gerado"
    && canAccessCalibrationCertificates(user?.role);

  return (
    <div className="space-y-6 max-w-5xl w-full min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link to={WEIGHT_COLETA_LIST_PATH}><ArrowLeft size={18} className="mr-1" /> Voltar</Link>
          </Button>
          <h1 className="font-display text-xl font-semibold text-slate-900">
            {isNew ? "Nova coleta de pesos" : "Editar coleta de pesos"}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {certificateId && (
            <Button asChild variant="outline" type="button">
              <Link to={weightCertificateEditorPath(certificateId)}>
                <Certificate size={16} className="mr-1" /> Ver certificado
              </Link>
            </Button>
          )}
          {showGenerate && (
            <Button variant="outline" type="button" onClick={generateCertificate} disabled={generating}>
              <Certificate size={16} className="mr-1" />
              {generating ? "A gerar…" : "Gerar certificado"}
            </Button>
          )}
          <Button onClick={() => save()} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
            <FloppyDisk size={18} className="mr-1" />
            {saving ? "A guardar…" : "Salvar"}
          </Button>
        </div>
      </div>

      {!isNew && (
        <div className="flex flex-wrap gap-3 items-end">
          <div className="max-w-xs">
            <Label>Status da coleta</Label>
            <Select value={workflowStatus} onValueChange={setWorkflowStatus}>
              <SelectTrigger className="h-10 mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {COLETA_WORKFLOW_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="button" variant="outline" disabled={saving} onClick={() => markWorkflow("preenchida")}>
            Marcar preenchida
          </Button>
          <Button type="button" variant="outline" disabled={saving} onClick={() => markWorkflow("conferida")}>
            Marcar conferida
          </Button>
          {showGenerate && (
            <div className="max-w-[10rem]">
              <Label>Tipo certificado</Label>
              <Select value={certType} onValueChange={setCertType}>
                <SelectTrigger className="h-10 mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CERTIFICATE_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {showGenerate && !canColetaGenerateOfficial(workflowStatus) && (
            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 self-end">
              Coleta ainda não conferida — será gerada uma prévia técnica.
            </p>
          )}
        </div>
      )}

      <Card>
        <CardContent className="p-4 sm:p-6 space-y-4">
          <h2 className="font-medium text-slate-900">Cliente</h2>
          {customerOptions.length === 0 ? (
            <p className="text-sm text-slate-600">
              Nenhum cliente cadastrado.{" "}
              <Link to={cadastroSectionPath("clientes")} className="text-blue-600 hover:underline">
                PR-7.1 → Clientes
              </Link>
            </p>
          ) : (
            <div>
              <Label className="text-[11px]">Selecionar do cadastro</Label>
              <select
                value={selectedEndCustomerId}
                onChange={(e) => applyCustomer(e.target.value)}
                className="w-full border rounded-md h-10 px-3 text-sm bg-white mt-1"
              >
                <option value="">— Selecionar para preencher automaticamente —</option>
                {customerOptions.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500 mt-1">
                Cadastro em{" "}
                <Link to={cadastroSectionPath("clientes")} className="text-blue-600 hover:underline">
                  PR-7.1 → Clientes
                </Link>
              </p>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              ["solicitante", "Solicitante"],
              ["contratante", "Contratante"],
              ["responsavel", "Responsável"],
              ["cnpj", "CNPJ"],
              ["endereco", "Endereço"],
              ["cidade", "Cidade"],
              ["estado", "Estado"],
              ["unidade", "Unidade"],
            ].map(([k, label]) => (
              <div key={k}>
                <Label className="text-[11px]">{label}</Label>
                <Input className={fieldClass} value={payload.cliente?.[k] || ""} onChange={(e) => setCliente(k, e.target.value)} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 sm:p-6 space-y-4">
          <h2 className="font-medium text-slate-900">Geral</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label className="text-[11px]">Data de calibração</Label>
              <Input type="date" className={fieldClass} value={payload.geral?.data_calibracao || ""} onChange={(e) => setGeral("data_calibracao", e.target.value)} />
            </div>
            <div>
              <Label className="text-[11px]">Nº processo / proposta</Label>
              <Input className={fieldClass} value={payload.geral?.processo_numero || ""} onChange={(e) => setGeral("processo_numero", e.target.value)} />
            </div>
            <div>
              <Label className="text-[11px]">Identificação / tag</Label>
              <Input className={fieldClass} value={payload.geral?.identificacao || ""} onChange={(e) => setGeral("identificacao", e.target.value)} />
            </div>
            <div>
              <Label className="text-[11px]">Fabricante</Label>
              <Input className={fieldClass} value={payload.geral?.fabricante || ""} onChange={(e) => setGeral("fabricante", e.target.value)} />
            </div>
            <div>
              <Label className="text-[11px]">Série</Label>
              <Input className={fieldClass} value={payload.geral?.serie || ""} onChange={(e) => setGeral("serie", e.target.value)} />
            </div>
            <div>
              <Label className="text-[11px]">Qtde linhas exibição</Label>
              <Input
                type="number"
                className={fieldClass}
                value={payload.geral?.qtde_linhas ?? 2}
                onChange={(e) => setGeral("qtde_linhas", Number(e.target.value) || 2)}
              />
            </div>
            <div>
              <Label className="text-[11px]">Foi ajuste</Label>
              <Select value={payload.geral?.foi_ajuste || "nao"} onValueChange={(v) => setGeral("foi_ajuste", v)}>
                <SelectTrigger className={fieldClass}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="nao">Não</SelectItem>
                  <SelectItem value="sim">Sim</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[11px]">Executores</Label>
              <Input
                className={fieldClass}
                value={payload.executores || ""}
                onChange={(e) => setPayload((p) => ({ ...p, executores: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(payload.peso_descricoes || ["", "", "", ""]).map((d, i) => (
              <div key={i}>
                <Label className="text-[11px]">Descrição {i + 1}</Label>
                <Input
                  className={fieldClass}
                  value={d || ""}
                  onChange={(e) => {
                    const next = [...(payload.peso_descricoes || ["", "", "", ""])];
                    next[i] = e.target.value;
                    setPayload((p) => ({ ...p, peso_descricoes: next }));
                  }}
                />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {["obs1", "obs2", "obs3"].map((k, i) => (
              <div key={k}>
                <Label className="text-[11px]">Observação {i + 1}</Label>
                <Input className={fieldClass} value={payload.geral?.[k] || ""} onChange={(e) => setGeral(k, e.target.value)} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 sm:p-6">
          <WeightAmbientSection
            ambiente={payload.ambiente}
            envCerts={envCerts}
            onAmbienteChange={onAmbienteChange}
            fieldClass={fieldClass}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 sm:p-6 space-y-6">
          <h2 className="font-medium text-slate-900">Rastreabilidade</h2>
          <TraceRows
            title="Balanças"
            rows={payload.rastreabilidade?.balancas}
            onChange={(rows) => setRastro("balancas", rows)}
          />
          <TraceRows
            title="Conjuntos / pesos-padrão"
            rows={payload.rastreabilidade?.conjuntos_peso}
            onChange={(rows) => setRastro("conjuntos_peso", rows)}
          />
          <TraceRows
            title="TBH (preenchido ao selecionar no ambiente; editável)"
            rows={payload.rastreabilidade?.tbh}
            onChange={(rows) => setRastro("tbh", rows)}
          />
        </CardContent>
      </Card>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-medium text-slate-900">
            Itens ({(payload.itens || []).length}/{MAX_WEIGHT_ITEMS})
          </h2>
          <Button type="button" variant="outline" size="sm" onClick={addItem}>
            <Plus size={14} className="mr-1" /> Adicionar item
          </Button>
        </div>
        {(payload.itens || []).map((item, idx) => (
          <WeightItemCard
            key={idx}
            index={idx}
            item={item}
            expanded={expandedItems.has(idx)}
            onToggle={() => setExpandedItems((prev) => {
              const next = new Set(prev);
              if (next.has(idx)) next.delete(idx);
              else next.add(idx);
              return next;
            })}
            onChange={(nextItem) => {
              setPayload((p) => {
                const itens = [...(p.itens || [])];
                itens[idx] = nextItem;
                return { ...p, itens };
              });
            }}
            onRemove={() => {
              setPayload((p) => ({
                ...p,
                itens: (p.itens || []).filter((_, i) => i !== idx),
              }));
            }}
            weightItems={weightItems}
            weightCerts={weightCerts}
          />
        ))}
      </div>

      <div className="flex flex-wrap gap-2 justify-end pb-8">
        <Button onClick={() => save()} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
          <FloppyDisk size={18} className="mr-1" />
          {saving ? "A guardar…" : "Salvar"}
        </Button>
      </div>
    </div>
  );
}
