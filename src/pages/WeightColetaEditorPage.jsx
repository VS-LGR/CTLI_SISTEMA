import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { ArrowLeft, FloppyDisk, Plus, Trash, CaretDown, CaretUp, Certificate, Microphone } from "@phosphor-icons/react";
import { toast } from "sonner";
import {
  emptyWeightColetaPayload,
  emptyWeightItem,
  emptyWeightCycles,
  MAX_WEIGHT_ITEMS,
  DEFAULT_WEIGHT_CYCLE_COUNT,
  MIN_WEIGHT_CYCLE_COUNT,
  MAX_WEIGHT_CYCLE_COUNT,
  clampWeightCycleCount,
  END_CUSTOMER_LOOKUP_SELECT,
  applyEndCustomerToWeightCliente,
  resolveWeightEndCustomerId,
  normalizeWeightAmbiente,
  validateWeightCalcPayload,
} from "@/lib/weightCalibration/weightColetaSchema";
import { cadastroSectionPath } from "@/lib/cadastroSections";
import WeightAmbientSection from "@/components/weightCalibration/WeightAmbientSection";
import StandardWeightPickerPanel from "@/components/shared/StandardWeightPickerPanel";
import VoiceFieldControl from "@/components/voice/VoiceFieldControl";
import WeightColetaVoiceWizard, {
  buildWeightColetaVoiceSteps,
} from "@/components/voice/WeightColetaVoiceWizard";
import { isSpeechRecognitionSupported } from "@/lib/voice/speechRecognition";
import { YES_NO_OPTIONS, NOMINAL_UNIT_OPTIONS } from "@/lib/voice/spokenMatch";
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
  const n = clampWeightCycleCount(count);
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

const CLASS_VOICE_OPTIONS = WEIGHT_CLASSES.map((c) => ({
  value: c,
  label: c,
  aliases: [c.toLowerCase()],
}));

const MATERIAL_VOICE_OPTIONS = MATERIALS.map((m) => ({
  value: m,
  label: m,
  aliases: [m.toLowerCase()],
}));

function TraceRows({ title, rows, onChange, voiceEnabled = false }) {
  const patchRow = (idx, key, value) => {
    const next = [...rows];
    next[idx] = { ...next[idx], [key]: value };
    onChange(next);
  };

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
                <VoiceFieldControl
                  voiceEnabled={voiceEnabled}
                  kind="text"
                  label="Identificação"
                  inputClassName={fieldClass}
                  value={row.identificacao || ""}
                  onChange={(v) => patchRow(idx, "identificacao", v)}
                  onConfirmValue={(p) => patchRow(idx, "identificacao", p.value)}
                />
              </div>
              <div>
                <Label className="text-[11px]">Certificado</Label>
                <VoiceFieldControl
                  voiceEnabled={voiceEnabled}
                  kind="text"
                  label="Certificado"
                  inputClassName={fieldClass}
                  value={row.certificado || ""}
                  onChange={(v) => patchRow(idx, "certificado", v)}
                  onConfirmValue={(p) => patchRow(idx, "certificado", p.value)}
                />
              </div>
              <div>
                <Label className="text-[11px]">Validade</Label>
                <Input
                  type="date"
                  className={fieldClass}
                  value={row.validade || ""}
                  onChange={(e) => patchRow(idx, "validade", e.target.value)}
                />
              </div>
              <div>
                <Label className="text-[11px]">Laboratório</Label>
                <Input
                  className={fieldClass}
                  value={row.laboratorio || ""}
                  onChange={(e) => patchRow(idx, "laboratorio", e.target.value)}
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
  voiceEnabled = false,
  itemMetaLocked = false,
}) {
  const set = (patch) => onChange({ ...item, ...patch });

  const setCycleReading = (ci, key, value) => {
    const cycles = [...(item.cycles || [])];
    while (cycles.length <= ci) cycles.push({ standard_reading: "", measuring_reading: "" });
    cycles[ci] = { ...cycles[ci], [key]: value };
    set({ cycles });
  };

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
                <VoiceFieldControl
                  voiceEnabled={voiceEnabled && !itemMetaLocked}
                  kind="text"
                  label="Identificação"
                  inputClassName={fieldClass}
                  value={item.identification || ""}
                  onChange={(v) => set({ identification: v })}
                  onConfirmValue={(p) => set({ identification: p.value })}
                  disabled={itemMetaLocked}
                />
              </div>
              <div>
                <Label className="text-[11px]">Valor nominal</Label>
                <VoiceFieldControl
                  voiceEnabled={voiceEnabled && !itemMetaLocked}
                  kind="number"
                  label="Valor nominal"
                  inputClassName={fieldClass}
                  value={item.nominal_value || ""}
                  onChange={(v) => set({ nominal_value: v })}
                  onConfirmValue={(p) => set({ nominal_value: p.value })}
                  disabled={itemMetaLocked}
                />
              </div>
              <div>
                <Label className="text-[11px]">Unidade</Label>
                <VoiceFieldControl
                  voiceEnabled={voiceEnabled && !itemMetaLocked}
                  kind="choice"
                  label="Unidade"
                  options={NOMINAL_UNIT_OPTIONS}
                  value={item.nominal_unit || "g"}
                  onChange={() => {}}
                  onConfirmValue={(p) => set({ nominal_unit: p.value })}
                  disabled={itemMetaLocked}
                >
                  <div className="min-w-0 flex-1">
                    <Select
                      value={item.nominal_unit || "g"}
                      onValueChange={(v) => set({ nominal_unit: v })}
                      disabled={itemMetaLocked}
                    >
                      <SelectTrigger className={fieldClass}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["mg", "g", "kg"].map((u) => (
                          <SelectItem key={u} value={u}>{u}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </VoiceFieldControl>
              </div>
              <div>
                <Label className="text-[11px]">Classe (UUT)</Label>
                <VoiceFieldControl
                  voiceEnabled={voiceEnabled}
                  kind="choice"
                  label="Classe (UUT)"
                  options={CLASS_VOICE_OPTIONS}
                  value={item.uut_class || ""}
                  onChange={() => {}}
                  onConfirmValue={(p) => set({ uut_class: p.value || "" })}
                >
                  <div className="min-w-0 flex-1">
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
                </VoiceFieldControl>
              </div>
              <div>
                <Label className="text-[11px]">Material do mensurando (UUT)</Label>
                <VoiceFieldControl
                  voiceEnabled={voiceEnabled}
                  kind="choice"
                  label="Material do mensurando"
                  options={MATERIAL_VOICE_OPTIONS}
                  value={item.uut_material || ""}
                  onChange={() => {}}
                  onConfirmValue={(p) => set({ uut_material: p.value || "" })}
                >
                  <div className="min-w-0 flex-1">
                    <Select value={item.uut_material || "__"} onValueChange={(v) => set({ uut_material: v === "__" ? "" : v })}>
                      <SelectTrigger className={fieldClass}><SelectValue placeholder="Material do peso calibrado" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__">—</SelectItem>
                        {MATERIALS.map((m) => (
                          <SelectItem key={m} value={m}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </VoiceFieldControl>
                <p className="text-[10px] text-slate-500 mt-0.5">Peso sob calibração — densidade no empuxo</p>
              </div>
              <div>
                <Label className="text-[11px]">Material do padrão</Label>
                <VoiceFieldControl
                  voiceEnabled={voiceEnabled}
                  kind="choice"
                  label="Material do padrão"
                  options={MATERIAL_VOICE_OPTIONS}
                  value={item.reference_material || ""}
                  onChange={() => {}}
                  onConfirmValue={(p) => set({ reference_material: p.value || "" })}
                >
                  <div className="min-w-0 flex-1">
                    <Select value={item.reference_material || "__"} onValueChange={(v) => set({ reference_material: v === "__" ? "" : v })}>
                      <SelectTrigger className={fieldClass}><SelectValue placeholder="Material do peso de referência" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__">—</SelectItem>
                        {MATERIALS.map((m) => (
                          <SelectItem key={m} value={m}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </VoiceFieldControl>
                <p className="text-[10px] text-slate-500 mt-0.5">Preenchido pelo cadastro; editável se necessário</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[11px]">Peso de referência (cadastro)</Label>
              <VoiceFieldControl
                voiceEnabled={voiceEnabled}
                kind="lookup"
                label="Peso de referência"
                records={weightItems}
                getLabel={(w) => w.identification || ""}
                getSearchText={(w) => `${w.identification || ""} ${w.conventional_value || ""}`}
                displayValue={item.reference_identification || ""}
                value={item.reference_standard_id || ""}
                onChange={() => {}}
                onConfirmValue={(p) => {
                  if (p.record?.id) applyReference(p.record.id);
                  else if (p.label || p.value) {
                    set({
                      reference_standard_id: null,
                      reference_identification: p.label || p.value || "",
                    });
                  }
                }}
                className="items-start"
              >
                <div className="min-w-0 flex-1">
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
                </div>
              </VoiceFieldControl>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label className="text-[11px]">Ident. referência</Label>
                  <VoiceFieldControl
                    voiceEnabled={voiceEnabled}
                    kind="text"
                    label="Ident. referência"
                    inputClassName={fieldClass}
                    value={item.reference_identification || ""}
                    onChange={(v) => set({ reference_identification: v })}
                    onConfirmValue={(p) => set({ reference_identification: p.value })}
                  />
                </div>
                <div>
                  <Label className="text-[11px]">VVC referência</Label>
                  <VoiceFieldControl
                    voiceEnabled={voiceEnabled}
                    kind="number"
                    label="VVC referência"
                    inputClassName={fieldClass}
                    value={item.reference_conventional_value || ""}
                    onChange={(v) => set({ reference_conventional_value: v })}
                    onConfirmValue={(p) => set({ reference_conventional_value: p.value })}
                  />
                </div>
                <div>
                  <Label className="text-[11px]">Ue referência</Label>
                  <VoiceFieldControl
                    voiceEnabled={voiceEnabled}
                    kind="number"
                    label="Ue referência"
                    inputClassName={fieldClass}
                    value={item.reference_uncertainty || ""}
                    onChange={(v) => set({ reference_uncertainty: v })}
                    onConfirmValue={(p) => set({ reference_uncertainty: p.value })}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <Label className="text-[11px]">Resolução</Label>
                <VoiceFieldControl
                  voiceEnabled={voiceEnabled}
                  kind="number"
                  label="Resolução"
                  inputClassName={fieldClass}
                  value={item.balance_resolution || ""}
                  onChange={(v) => set({ balance_resolution: v })}
                  onConfirmValue={(p) => set({ balance_resolution: p.value })}
                />
              </div>
              <div>
                <Label className="text-[11px]">Casas decimais</Label>
                <VoiceFieldControl
                  voiceEnabled={voiceEnabled}
                  kind="number"
                  label="Casas decimais"
                  inputClassName={fieldClass}
                  type="number"
                  value={item.decimal_places ?? 2}
                  onChange={(v) => set({ decimal_places: Number(v) || 0 })}
                  onConfirmValue={(p) => set({ decimal_places: Number(p.value) || 0 })}
                />
              </div>
              <div>
                <Label className="text-[11px]">Nº ciclos (PR-7.2: 5; 3–10)</Label>
                <VoiceFieldControl
                  voiceEnabled={voiceEnabled}
                  kind="number"
                  label="Número de ciclos"
                  inputClassName={fieldClass}
                  type="number"
                  min={MIN_WEIGHT_CYCLE_COUNT}
                  max={MAX_WEIGHT_CYCLE_COUNT}
                  value={item.cycle_count ?? DEFAULT_WEIGHT_CYCLE_COUNT}
                  onChange={(v) => {
                    const cycle_count = clampWeightCycleCount(v || DEFAULT_WEIGHT_CYCLE_COUNT);
                    set({ cycle_count, cycles: resizeCycles(item.cycles, cycle_count) });
                  }}
                  onConfirmValue={(p) => {
                    const cycle_count = clampWeightCycleCount(p.numeric ?? p.value ?? DEFAULT_WEIGHT_CYCLE_COUNT);
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
              <Label className="text-[11px] block mb-1">
                Ensaio de repetitividade ABA — padrão (P) / mensurando (M)
              </Label>
              <div className="space-y-1">
                {(item.cycles || []).map((c, ci) => (
                  <div key={ci} className="grid grid-cols-[2rem_1fr_1fr] gap-2 items-center">
                    <span className="text-xs text-slate-500">{ci + 1}</span>
                    <VoiceFieldControl
                      voiceEnabled={voiceEnabled}
                      kind="number"
                      label={`Ciclo ${ci + 1} — Leitura padrão (P)`}
                      inputClassName={fieldClass}
                      placeholder="Leitura padrão (P)"
                      value={c.standard_reading || ""}
                      onChange={(v) => setCycleReading(ci, "standard_reading", v)}
                      onConfirmValue={(p) => setCycleReading(ci, "standard_reading", p.value)}
                    />
                    <VoiceFieldControl
                      voiceEnabled={voiceEnabled}
                      kind="number"
                      label={`Ciclo ${ci + 1} — Leitura mensurando (M)`}
                      inputClassName={fieldClass}
                      placeholder="Leitura mensurando (M)"
                      value={c.measuring_reading || ""}
                      onChange={(v) => setCycleReading(ci, "measuring_reading", v)}
                      onConfirmValue={(p) => setCycleReading(ci, "measuring_reading", p.value)}
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
                <div className="w-44">
                  <Label className="text-[11px]">Valor antes do ajuste</Label>
                  <VoiceFieldControl
                    voiceEnabled={voiceEnabled}
                    kind="number"
                    label="Valor antes do ajuste"
                    inputClassName={fieldClass}
                    value={item.value_before_adjustment || ""}
                    onChange={(v) => set({ value_before_adjustment: v })}
                    onConfirmValue={(p) => set({ value_before_adjustment: p.value })}
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
  const [commercialProposalId, setCommercialProposalId] = useState(null);
  const [commercialProposalWeightItemId, setCommercialProposalWeightItemId] = useState(null);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [certType, setCertType] = useState("rastreavel");
  const [endCustomers, setEndCustomers] = useState([]);
  const [weightItems, setWeightItems] = useState([]);
  const [weightCerts, setWeightCerts] = useState([]);
  const [envCerts, setEnvCerts] = useState([]);
  const [expandedItems, setExpandedItems] = useState(() => new Set([0]));
  const speechSupported = useMemo(() => isSpeechRecognitionSupported(), []);
  const [voiceEnabled, setVoiceEnabled] = useState(() => isSpeechRecognitionSupported());
  const [voiceMode, setVoiceMode] = useState("field"); // field | sequence
  const [wizardOpen, setWizardOpen] = useState(false);
  const autoWizardOpenedRef = useRef(false);

  const setAmbientField = useCallback((key, value) => {
    setPayload((p) => {
      const ambiente = { ...normalizeWeightAmbiente(p.ambiente), [key]: value };
      if (ambiente.tbh_correction_applied) {
        ambiente.tbh_correction_applied = false;
        const raw = { ...(ambiente.tbh_correction_raw || {}) };
        delete raw[key];
        ambiente.tbh_correction_raw = raw;
      }
      return { ...p, ambiente };
    });
  }, []);

  const patchItem = useCallback((ii, patch) => {
    setPayload((p) => {
      const itens = [...(p.itens || [])];
      itens[ii] = { ...(itens[ii] || emptyWeightItem()), ...patch };
      return { ...p, itens };
    });
  }, []);

  const applyItemReference = useCallback((ii, refId) => {
    setPayload((p) => {
      const itens = [...(p.itens || [])];
      const item = { ...(itens[ii] || emptyWeightItem()) };
      if (!refId || refId === "__none") {
        itens[ii] = {
          ...item,
          reference_standard_id: null,
          reference_identification: "",
          reference_conventional_value: "",
          reference_uncertainty: "",
          reference_material: "",
        };
        return { ...p, itens };
      }
      const ref = weightItems.find((w) => w.id === refId);
      if (!ref) return p;
      itens[ii] = {
        ...item,
        reference_standard_id: ref.id,
        reference_identification: ref.identification || "",
        reference_conventional_value: ref.conventional_value || "",
        reference_uncertainty: ref.expanded_uncertainty || "",
        reference_material: ref.material || ref.material_preset || "",
        nominal_unit: ref.unit || item.nominal_unit || "g",
      };
      return { ...p, itens };
    });
  }, [weightItems]);

  const ensureItemCycles = useCallback((ii, n) => {
    const cycle_count = clampWeightCycleCount(n);
    setPayload((p) => {
      const itens = [...(p.itens || [])];
      const item = { ...(itens[ii] || emptyWeightItem()) };
      item.cycle_count = cycle_count;
      item.cycles = resizeCycles(item.cycles || emptyWeightCycles(cycle_count), cycle_count);
      itens[ii] = item;
      return { ...p, itens };
    });
  }, []);

  const setItemCycleReading = useCallback((ii, ci, key, value) => {
    setPayload((p) => {
      const itens = [...(p.itens || [])];
      const item = { ...(itens[ii] || emptyWeightItem()) };
      const cycles = [...(item.cycles || [])];
      while (cycles.length <= ci) cycles.push({ standard_reading: "", measuring_reading: "" });
      cycles[ci] = { ...cycles[ci], [key]: value };
      item.cycles = cycles;
      itens[ii] = item;
      return { ...p, itens };
    });
  }, []);

  const setCliente = useCallback((k, v) => {
    setPayload((p) => ({ ...p, cliente: { ...p.cliente, [k]: v } }));
  }, []);

  const setGeral = useCallback((k, v) => {
    setPayload((p) => ({ ...p, geral: { ...p.geral, [k]: v } }));
  }, []);

  const setExecutores = useCallback((v) => {
    setPayload((p) => ({ ...p, executores: v }));
  }, []);

  const setPesoDescricao = useCallback((i, v) => {
    setPayload((p) => {
      const next = [...(p.peso_descricoes || ["", "", "", ""])];
      next[i] = v;
      return { ...p, peso_descricoes: next };
    });
  }, []);

  const applyCustomer = useCallback((custId) => {
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
    setPayload((p) => {
      const c = endCustomers.find((x) => x.id === custId);
      if (!c) return p;
      return {
        ...p,
        cliente: applyEndCustomerToWeightCliente(p.cliente, c),
      };
    });
  }, [endCustomers]);

  const headerLocked = Boolean(commercialProposalId || commercialProposalWeightItemId);

  const wizardSteps = useMemo(
    () => buildWeightColetaVoiceSteps({
      payload,
      endCustomers,
      weightItems,
      envCerts,
      applyCustomer,
      setClienteField: setCliente,
      setGeralField: setGeral,
      setAmbientField,
      setExecutores,
      setPesoDescricao,
      patchItem,
      applyItemReference,
      ensureItemCycles,
      setItemCycleReading,
      confirmHeaderThenReadings: headerLocked,
    }),
    [
      payload,
      endCustomers,
      weightItems,
      envCerts,
      applyCustomer,
      setCliente,
      setGeral,
      setAmbientField,
      setExecutores,
      setPesoDescricao,
      patchItem,
      applyItemReference,
      ensureItemCycles,
      setItemCycleReading,
      headerLocked,
    ],
  );

  const toggleVoice = useCallback((next) => {
    if (next && !speechSupported) {
      toast.error("Reconhecimento de voz não suportado. Use Chrome ou Edge.");
      setVoiceEnabled(false);
      return;
    }
    setVoiceEnabled(next);
  }, [speechSupported]);

  useEffect(() => {
    if (
      isNew
      && voiceEnabled
      && speechSupported
      && voiceMode === "sequence"
      && !autoWizardOpenedRef.current
    ) {
      autoWizardOpenedRef.current = true;
      setWizardOpen(true);
    }
  }, [isNew, voiceEnabled, speechSupported, voiceMode]);

  const fieldVoice = voiceEnabled && voiceMode === "field";

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
      setCommercialProposalId(data.commercial_proposal_id || null);
      setCommercialProposalWeightItemId(data.commercial_proposal_weight_item_id || null);
    } catch (e) {
      toast.error(e.message);
      navigate(WEIGHT_COLETA_LIST_PATH);
    } finally {
      setLoading(false);
    }
  }, [id, isNew, currentTenantId, user?.role, navigate]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadLookups(); }, [loadLookups]);

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

  if (!canAccessColeta(user?.role, user)) {
    return <Navigate to="/dashboard" replace />;
  }
  if (!isSupabaseAuthMode || !currentTenantId) {
    return <Navigate to={WEIGHT_COLETA_LIST_PATH} replace />;
  }

  const persist = async (nextWorkflow = workflowStatus) => {
    const saved = await saveWeightColeta(currentTenantId, isNew ? null : id, {
      payload,
      workflow_status: nextWorkflow,
      commercial_proposal_id: commercialProposalId,
      commercial_proposal_weight_item_id: commercialProposalWeightItemId,
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
        if (["preenchida", "conferida"].includes(status)) {
          const { notifyColetaStatusChange } = await import("@/lib/coletaNotify");
          await notifyColetaStatusChange({
            tenantId: currentTenantId,
            kind: "weight",
            status,
            clientName: payload?.cliente?.solicitante || "",
            proposalRef: payload?.geral?.processo_numero || "",
          });
          toast.message("Escritório notificado: coleta disponível para certificado.");
        }
        navigate(WEIGHT_COLETA_LIST_PATH);
      } else {
        await persist(status);
        await updateWeightColetaWorkflow(id, status);
        setWorkflowStatus(status);
        toast.success(
          status === "preenchida"
            ? "Coleta marcada como preenchida"
            : status === "conferida"
              ? "Coleta marcada como conferida"
              : `Status: ${status}`,
        );
        if (["preenchida", "conferida"].includes(status)) {
          const { notifyColetaStatusChange } = await import("@/lib/coletaNotify");
          await notifyColetaStatusChange({
            tenantId: currentTenantId,
            kind: "weight",
            status,
            clientName: payload?.cliente?.solicitante || "",
            proposalRef: payload?.geral?.processo_numero || "",
          });
          toast.message("Aviso registrado no dashboard: coleta aguardando certificado.");
        }
      }
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const generateCertificate = async () => {
    if (!canAccessCalibrationCertificates(user?.role, user)) {
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
    && canAccessCalibrationCertificates(user?.role, user);

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

      <Card className="border-blue-200 bg-blue-50/60">
        <CardContent className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-end gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Checkbox
              id="voice-enabled"
              checked={voiceEnabled}
              onCheckedChange={(v) => toggleVoice(Boolean(v))}
            />
            <Label htmlFor="voice-enabled" className="text-sm cursor-pointer flex items-center gap-1.5 font-medium text-slate-900">
              <Microphone size={16} />
              Entrada por voz (PR-7.2 — luvas/pinças)
            </Label>
          </div>
          {voiceEnabled && (
            <div className="max-w-xs w-full">
              <Label className="text-[11px]">Modo de voz</Label>
              <Select value={voiceMode} onValueChange={setVoiceMode}>
                <SelectTrigger className="h-10 mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="field">Campo a campo</SelectItem>
                  <SelectItem value="sequence">Sequência guiada (ABA)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          {voiceEnabled && voiceMode === "sequence" && (
            <Button
              type="button"
              variant="outline"
              className="min-h-10"
              onClick={() => setWizardOpen(true)}
            >
              <Microphone size={16} className="mr-1" />
              Iniciar sequência completa
            </Button>
          )}
          {!speechSupported && (
            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
              Voz indisponível neste navegador — use Chrome ou Edge. Teclado permanece ativo.
            </p>
          )}
          {voiceEnabled && speechSupported && (
            <p className="text-xs text-slate-600 max-w-xl">
              Cada valor ditado exige Confirmar ou Refazer antes de gravar. Método ABA (P→M) conforme PR-7.2 Rev.06.
            </p>
          )}
        </CardContent>
      </Card>

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
          {headerLocked && (
            <p className="text-xs text-blue-700 rounded-md border border-blue-200 bg-blue-50 px-2 py-1.5">
              Dados da proposta em somente leitura. Confirme o cabeçalho e preencha TBH/ambiente e leituras ABA.
            </p>
          )}
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
              <VoiceFieldControl
                voiceEnabled={fieldVoice && !headerLocked}
                kind="lookup"
                label="Cliente"
                records={customerOptions}
                getLabel={(c) => c.name || ""}
                getSearchText={(c) => `${c.name || ""} ${c.cnpj || ""}`}
                displayValue={
                  customerOptions.find((c) => c.id === selectedEndCustomerId)?.name || ""
                }
                value={selectedEndCustomerId || ""}
                onChange={() => {}}
                onConfirmValue={(p) => {
                  if (p.record?.id) applyCustomer(p.record.id);
                  else if (p.label) setCliente("solicitante", p.label);
                }}
                className="mt-1"
                disabled={headerLocked}
              >
                <select
                  value={selectedEndCustomerId}
                  onChange={(e) => applyCustomer(e.target.value)}
                  disabled={headerLocked}
                  className="w-full border rounded-md h-10 px-3 text-sm bg-white min-w-0 flex-1 disabled:bg-slate-100"
                >
                  <option value="">— Selecionar para preencher automaticamente —</option>
                  {customerOptions.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </VoiceFieldControl>
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
                <VoiceFieldControl
                  voiceEnabled={fieldVoice && !headerLocked}
                  kind="text"
                  label={label}
                  inputClassName={fieldClass}
                  value={payload.cliente?.[k] || ""}
                  onChange={(v) => setCliente(k, v)}
                  onConfirmValue={(p) => setCliente(k, p.value)}
                  disabled={headerLocked}
                />
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
              <VoiceFieldControl
                voiceEnabled={fieldVoice}
                kind="text"
                label="Data de calibração"
                type="date"
                inputClassName={fieldClass}
                value={payload.geral?.data_calibracao || ""}
                onChange={(v) => setGeral("data_calibracao", v)}
                onConfirmValue={(p) => setGeral("data_calibracao", p.value)}
              />
            </div>
            <div>
              <Label className="text-[11px]">Nº processo / proposta</Label>
              <VoiceFieldControl
                voiceEnabled={fieldVoice && !headerLocked}
                kind="text"
                label="Nº processo / proposta"
                inputClassName={fieldClass}
                value={payload.geral?.processo_numero || ""}
                onChange={(v) => setGeral("processo_numero", v)}
                onConfirmValue={(p) => setGeral("processo_numero", p.value)}
                disabled={headerLocked}
              />
            </div>
            <div>
              <Label className="text-[11px]">Identificação / tag</Label>
              <VoiceFieldControl
                voiceEnabled={fieldVoice && !headerLocked}
                kind="text"
                label="Identificação / tag"
                inputClassName={fieldClass}
                value={payload.geral?.identificacao || ""}
                onChange={(v) => setGeral("identificacao", v)}
                onConfirmValue={(p) => setGeral("identificacao", p.value)}
                disabled={headerLocked}
              />
            </div>
            <div>
              <Label className="text-[11px]">Fabricante</Label>
              <VoiceFieldControl
                voiceEnabled={fieldVoice && !headerLocked}
                kind="text"
                label="Fabricante"
                inputClassName={fieldClass}
                value={payload.geral?.fabricante || ""}
                onChange={(v) => setGeral("fabricante", v)}
                onConfirmValue={(p) => setGeral("fabricante", p.value)}
                disabled={headerLocked}
              />
            </div>
            <div>
              <Label className="text-[11px]">Série</Label>
              <VoiceFieldControl
                voiceEnabled={fieldVoice && !headerLocked}
                kind="text"
                label="Série"
                inputClassName={fieldClass}
                value={payload.geral?.serie || ""}
                onChange={(v) => setGeral("serie", v)}
                onConfirmValue={(p) => setGeral("serie", p.value)}
                disabled={headerLocked}
              />
            </div>
            <div>
              <Label className="text-[11px]">Qtde linhas exibição</Label>
              <VoiceFieldControl
                voiceEnabled={fieldVoice}
                kind="number"
                label="Qtde linhas exibição"
                type="number"
                inputClassName={fieldClass}
                value={payload.geral?.qtde_linhas ?? 2}
                onChange={(v) => setGeral("qtde_linhas", Number(v) || 2)}
                onConfirmValue={(p) => setGeral("qtde_linhas", Number(p.value) || 2)}
              />
            </div>
            <div>
              <Label className="text-[11px]">Foi ajuste</Label>
              <VoiceFieldControl
                voiceEnabled={fieldVoice}
                kind="choice"
                label="Foi ajuste"
                options={YES_NO_OPTIONS}
                value={payload.geral?.foi_ajuste || "nao"}
                onChange={() => {}}
                onConfirmValue={(p) => setGeral("foi_ajuste", p.value)}
              >
                <div className="min-w-0 flex-1">
                  <Select value={payload.geral?.foi_ajuste || "nao"} onValueChange={(v) => setGeral("foi_ajuste", v)}>
                    <SelectTrigger className={fieldClass}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nao">Não</SelectItem>
                      <SelectItem value="sim">Sim</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </VoiceFieldControl>
            </div>
            <div>
              <Label className="text-[11px]">Executores</Label>
              <VoiceFieldControl
                voiceEnabled={fieldVoice}
                kind="text"
                label="Executores"
                inputClassName={fieldClass}
                value={payload.executores || ""}
                onChange={(v) => setExecutores(v)}
                onConfirmValue={(p) => setExecutores(p.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(payload.peso_descricoes || ["", "", "", ""]).map((d, i) => (
              <div key={i}>
                <Label className="text-[11px]">Descrição {i + 1}</Label>
                <VoiceFieldControl
                  voiceEnabled={fieldVoice}
                  kind="text"
                  label={`Descrição ${i + 1}`}
                  inputClassName={fieldClass}
                  value={d || ""}
                  onChange={(v) => setPesoDescricao(i, v)}
                  onConfirmValue={(p) => setPesoDescricao(i, p.value)}
                />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {["obs1", "obs2", "obs3"].map((k, i) => (
              <div key={k}>
                <Label className="text-[11px]">Observação {i + 1}</Label>
                <VoiceFieldControl
                  voiceEnabled={fieldVoice}
                  kind="text"
                  label={`Observação ${i + 1}`}
                  inputClassName={fieldClass}
                  value={payload.geral?.[k] || ""}
                  onChange={(v) => setGeral(k, v)}
                  onConfirmValue={(p) => setGeral(k, p.value)}
                />
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
            voiceEnabled={fieldVoice}
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
            voiceEnabled={fieldVoice}
          />
          <TraceRows
            title="Conjuntos / pesos-padrão"
            rows={payload.rastreabilidade?.conjuntos_peso}
            onChange={(rows) => setRastro("conjuntos_peso", rows)}
            voiceEnabled={fieldVoice}
          />
          <TraceRows
            title="TBH (preenchido ao selecionar no ambiente; editável)"
            rows={payload.rastreabilidade?.tbh}
            onChange={(rows) => setRastro("tbh", rows)}
            voiceEnabled={fieldVoice}
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
            voiceEnabled={fieldVoice}
            itemMetaLocked={headerLocked}
          />
        ))}
      </div>

      <WeightColetaVoiceWizard
        open={wizardOpen}
        steps={wizardSteps}
        onClose={() => setWizardOpen(false)}
        onComplete={() => toast.success("Sequência de voz concluída")}
      />

      <div className="flex flex-wrap gap-2 justify-end pb-8">
        <Button onClick={() => save()} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
          <FloppyDisk size={18} className="mr-1" />
          {saving ? "A guardar…" : "Salvar"}
        </Button>
      </div>
    </div>
  );
}
