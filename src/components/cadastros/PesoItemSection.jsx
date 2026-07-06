import React, { useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, PencilSimple, Trash, ArrowCounterClockwise } from "@phosphor-icons/react";
import { sanitizeMassNumericInput } from "@/lib/massValueUtils";
import { WEIGHT_ITEM_UNITS } from "@/lib/cadastroConstants";
import CadastroListFilterBar from "@/components/cadastros/CadastroListFilterBar";
import {
  filterCadastroByQuery,
  weightItemCertNumber,
  weightItemCertStatus,
} from "@/lib/cadastroListUtils";
import {
  calculateStandardDrift,
  formatWeightStatus,
  driftFromWeightItem,
} from "@/lib/standardWeightCalculations";
import {
  oimlNominalHint,
  oimlNominalOptionsForUnit,
} from "@/lib/oimlR111NominalValues";
import { WEIGHT_PICKER_KIND_OPTIONS, filterWeightItemsByKind } from "@/lib/pesoPadraoPickerUtils";
import { isLoadBatchItem } from "@/lib/standardWeightItemUtils";
import { cadastroFilterFieldClass } from "@/components/cadastros/CadastroListFilterBar";
import EllipsisTooltip from "@/components/ui/ellipsis-tooltip";

const WEIGHT_STATUS_OPTIONS = [
  { value: "", label: "—" },
  { value: "1", label: "1º" },
  { value: "2", label: "2º" },
];

function driftDisplayValue(item) {
  const d = driftFromWeightItem(item);
  if (!d.valid) return item.standard_drift || "—";
  return String(d.value).replace(".", ",");
}

export default function PesoItemSection({ rows, weightCerts = [], tenantId, onRefresh }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] = useState("all");
  const [isLoadBatch, setIsLoadBatch] = useState(false);
  const [identification, setIdentification] = useState("");
  const [nominalValue, setNominalValue] = useState("");
  const [unit, setUnit] = useState("g");
  const [conventionalValue, setConventionalValue] = useState("");
  const [previousConventionalValue, setPreviousConventionalValue] = useState("");
  const [weightStatus, setWeightStatus] = useState("");
  const [expandedUncertainty, setExpandedUncertainty] = useState("");
  const [certificateNumber, setCertificateNumber] = useState("");
  const [weightCertificateId, setWeightCertificateId] = useState("");

  const computedDrift = useMemo(
    () => calculateStandardDrift({
      weightStatus,
      expandedUncertainty,
      conventionalValue,
      previousConventionalValue,
    }),
    [weightStatus, expandedUncertainty, conventionalValue, previousConventionalValue],
  );

  const oimlNominalOptions = useMemo(() => oimlNominalOptionsForUnit(unit), [unit]);
  const oimlHint = useMemo(() => oimlNominalHint(nominalValue, unit), [nominalValue, unit]);

  const filtered = useMemo(() => {
    const byKind = filterWeightItemsByKind(rows, kindFilter);
    return filterCadastroByQuery(byKind, query, (r) => [
      r.identification,
      r.nominal_value,
      r.conventional_value,
      r.expanded_uncertainty,
      r.certificate_number,
      weightItemCertNumber(r, weightCerts),
      isLoadBatchItem(r) ? "lote de carga" : "",
    ]);
  }, [rows, query, kindFilter, weightCerts]);

  const reset = () => {
    setEditing(null);
    setIsLoadBatch(false);
    setIdentification("");
    setNominalValue("");
    setConventionalValue("");
    setPreviousConventionalValue("");
    setWeightStatus("");
    setExpandedUncertainty("");
    setUnit("g");
    setCertificateNumber("");
    setWeightCertificateId("");
  };

  const handleNovaCalibracao = () => {
    if (!conventionalValue.trim()) {
      toast.error("Informe o V.V.C atual antes de registrar nova calibração");
      return;
    }
    setPreviousConventionalValue(conventionalValue);
    setConventionalValue("");
    setExpandedUncertainty("");
    setWeightStatus("2");
    toast.info("V.V.C copiado para anterior. Preencha os novos valores da calibração.");
  };

  const save = async () => {
    if (!tenantId) return toast.error("Selecione um ambiente válido no topo da página");
    if (!identification.trim()) {
      return toast.error(isLoadBatch ? "Informe a identificação do lote" : "Informe a identificação do peso");
    }
    if (isLoadBatch && !nominalValue.trim()) {
      return toast.error("Informe o valor nominal do lote de carga");
    }
    if (isLoadBatch && !conventionalValue.trim()) {
      return toast.error("Informe o V.V.C do lote de carga");
    }
    if (isLoadBatch && !expandedUncertainty.trim()) {
      return toast.error("Informe a incerteza expandida (Ue) do lote de carga");
    }

    let driftStr = "";
    if (!isLoadBatch) {
      const drift = calculateStandardDrift({
        weightStatus,
        expandedUncertainty,
        conventionalValue,
        previousConventionalValue,
      });

      if (weightStatus && !drift.valid) {
        return toast.error(drift.reason || "Não foi possível calcular a deriva do padrão");
      }
      driftStr = drift.valid ? String(drift.value) : "";
    }

    const base = isLoadBatch
      ? {
        tenant_id: tenantId,
        identification: identification.trim(),
        nominal_value: nominalValue.trim(),
        conventional_value: conventionalValue.trim(),
        expanded_uncertainty: expandedUncertainty.trim(),
        unit: unit || "g",
        is_load_batch: true,
        previous_conventional_value: "",
        standard_drift: "",
        weight_status: "",
        active: true,
        certificate_number: "",
        weight_certificate_id: null,
      }
      : {
        tenant_id: tenantId,
        identification: identification.trim(),
        nominal_value: nominalValue.trim(),
        conventional_value: conventionalValue.trim(),
        previous_conventional_value: previousConventionalValue.trim(),
        standard_drift: driftStr,
        weight_status: weightStatus.trim(),
        expanded_uncertainty: expandedUncertainty.trim(),
        unit: unit || "g",
        is_load_batch: false,
        active: true,
        certificate_number: certificateNumber.trim(),
        weight_certificate_id: weightCertificateId || null,
      };
    try {
      if (editing) {
        const { error } = await supabase.from("standard_weight_items").update(base).eq("id", editing.id);
        if (error) throw error;
        toast.success("Atualizado");
      } else {
        const { error } = await supabase.from("standard_weight_items").insert(base);
        if (error) throw error;
        toast.success("Cadastrado");
      }
      setOpen(false);
      reset();
      onRefresh();
    } catch (err) {
      const msg = err?.message || "Falha";
      if (/tenant_id_fkey/i.test(msg)) {
        toast.error("Ambiente inválido. Selecione novamente o cliente no topo.");
      } else toast.error(msg);
    }
  };

  const remove = async (r) => {
    if (!window.confirm(`Excluir peso ${r.identification}?`)) return;
    const { error } = await supabase.from("standard_weight_items").delete().eq("id", r.id);
    if (error) toast.error(error.message);
    else { toast.success("Removido"); onRefresh(); }
  };

  const openEdit = (r) => {
    setEditing(r);
    setIsLoadBatch(isLoadBatchItem(r));
    setIdentification(r.identification);
    setNominalValue(r.nominal_value);
    setConventionalValue(r.conventional_value || "");
    setPreviousConventionalValue(r.previous_conventional_value || "");
    setWeightStatus(r.weight_status || "");
    setExpandedUncertainty(r.expanded_uncertainty || "");
    setUnit(r.unit || "g");
    setCertificateNumber(r.certificate_number || "");
    setWeightCertificateId(r.weight_certificate_id || "");
    setOpen(true);
  };

  const openNew = (asLoadBatch = false) => {
    reset();
    setIsLoadBatch(asLoadBatch);
    if (!asLoadBatch) setWeightStatus("1");
    setOpen(true);
  };

  const clearFilters = () => {
    setQuery("");
    setKindFilter("all");
  };

  return (
    <Card className="border-slate-200">
      <CardContent className="p-4 space-y-4">
        <div className="flex flex-wrap justify-between gap-2">
          <p className="text-sm text-slate-600">
            Pesos padrão individuais e lotes de carga (aba CAD PESOS-PADRÃO).
          </p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => openNew(true)}>
              <Plus size={16} className="mr-1" /> Novo lote
            </Button>
            <Button size="sm" className="bg-blue-600 text-white" onClick={() => openNew(false)}>
              <Plus size={16} className="mr-1" /> Novo peso
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          <CadastroListFilterBar
            query={query}
            onQueryChange={setQuery}
            placeholder="Buscar por identificação, valor nominal, material ou certificado…"
            filteredCount={filtered.length}
            totalCount={rows.length}
            onClear={clearFilters}
            testIdPrefix="peso-item"
          />
          <div className="flex flex-wrap items-center gap-2 px-1">
            <Label className="text-xs text-slate-500 shrink-0">Tipo</Label>
            <select
              value={kindFilter}
              onChange={(e) => setKindFilter(e.target.value)}
              className={`${cadastroFilterFieldClass} w-full sm:w-[11rem] px-2`}
              data-testid="peso-item-filter-kind"
            >
              {WEIGHT_PICKER_KIND_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto border rounded-md">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-600">
              <tr>
                <th className="p-2">ID</th>
                <th className="p-2">Tipo</th>
                <th className="p-2">V.N / Vc</th>
                <th className="p-2">V.V.C</th>
                <th className="p-2">Ue</th>
                <th className="p-2">Nº certificado</th>
                <th className="p-2">Situação</th>
                <th className="p-2">V.V.C ant.</th>
                <th className="p-2">Deriva</th>
                <th className="p-2">Status</th>
                <th className="p-2 w-24" />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={11} className="p-4 text-center text-slate-500">Nenhum registro encontrado.</td></tr>
              )}
              {filtered.map((r) => {
                const st = weightItemCertStatus(r, weightCerts);
                const lot = isLoadBatchItem(r);
                const certNum = weightItemCertNumber(r, weightCerts);
                return (
                  <tr key={r.id} className="border-t border-slate-100">
                    <td className="p-2 font-mono max-w-[6rem]">
                      <EllipsisTooltip label={r.identification || ""} className="block">
                        {r.identification}
                      </EllipsisTooltip>
                    </td>
                    <td className="p-2">
                      {lot ? (
                        <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-100 font-normal text-[10px]">
                          Lote
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="font-normal text-[10px]">Peso</Badge>
                      )}
                    </td>
                    <td className="p-2">
                      {r.nominal_value} {r.unit}
                    </td>
                    <td className="p-2">{r.conventional_value || "—"} {r.conventional_value ? r.unit : ""}</td>
                    <td className="p-2">{r.expanded_uncertainty || "—"} {r.expanded_uncertainty ? r.unit : ""}</td>
                    <td className="p-2 max-w-[8rem]">
                      <EllipsisTooltip label={certNum || ""} className="block">
                        {certNum}
                      </EllipsisTooltip>
                    </td>
                    <td className="p-2">
                      {st.vigente == null ? (
                        <span className="text-slate-400">—</span>
                      ) : (
                        <Badge
                          className={
                            st.vigente
                              ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100 font-normal text-[10px]"
                              : "bg-red-100 text-red-800 hover:bg-red-100 font-normal text-[10px]"
                          }
                        >
                          {st.label}
                        </Badge>
                      )}
                    </td>
                    <td className="p-2">{r.previous_conventional_value || "—"}</td>
                    <td className="p-2">{driftDisplayValue(r)}</td>
                    <td className="p-2">{formatWeightStatus(r.weight_status)}</td>
                    <td className="p-2">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(r)}><PencilSimple size={16} /></Button>
                      <Button variant="ghost" size="sm" className="text-red-600" onClick={() => remove(r)}><Trash size={16} /></Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editing
                  ? (isLoadBatch ? "Editar lote de carga" : "Editar peso")
                  : (isLoadBatch ? "Novo lote de carga" : "Novo peso padrão")}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Identificação *</Label>
                <Input
                  value={identification}
                  onChange={(e) => setIdentification(e.target.value)}
                  placeholder={isLoadBatch ? "Ex.: L-190-Aço" : "Ex.: P-22"}
                />
              </div>
              {isLoadBatch ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>V.N. (valor nominal)</Label>
                      <Input
                        inputMode="decimal"
                        value={nominalValue}
                        onChange={(e) => setNominalValue(sanitizeMassNumericInput(e.target.value))}
                        placeholder="Ex.: 190"
                      />
                    </div>
                    <div>
                      <Label>V.V.C. (valor convencional)</Label>
                      <Input
                        inputMode="decimal"
                        value={conventionalValue}
                        onChange={(e) => setConventionalValue(sanitizeMassNumericInput(e.target.value))}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Ue (incerteza expandida)</Label>
                      <Input
                        inputMode="decimal"
                        value={expandedUncertainty}
                        onChange={(e) => setExpandedUncertainty(sanitizeMassNumericInput(e.target.value))}
                      />
                    </div>
                    <div>
                      <Label>Unidade</Label>
                      <select
                        value={unit}
                        onChange={(e) => setUnit(e.target.value)}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
                      >
                        {WEIGHT_ITEM_UNITS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500">
                    Lotes de carga são usados nos pontos P2+ com substituição (PR-7.6).
                    A densidade do material e o empuxo são definidos no ponto, como nos pesos padrão.
                  </p>
                </>
              ) : (
                <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>V.N (valor nominal)</Label>
                  <Input
                    inputMode="decimal"
                    list="oiml-nominal-values"
                    value={nominalValue}
                    onChange={(e) => setNominalValue(sanitizeMassNumericInput(e.target.value))}
                    placeholder="Série OIML R 111-1"
                  />
                  <datalist id="oiml-nominal-values">
                    {oimlNominalOptions.map((v) => (
                      <option key={`${unit}-${v}`} value={v} />
                    ))}
                  </datalist>
                  {oimlHint && (
                    <p className="text-xs text-amber-700 mt-1">{oimlHint}</p>
                  )}
                </div>
                <div>
                  <Label>V.V.C (valor convencional)</Label>
                  <Input inputMode="decimal" value={conventionalValue} onChange={(e) => setConventionalValue(sanitizeMassNumericInput(e.target.value))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>V.V.C anterior</Label>
                  <Input value={previousConventionalValue} onChange={(e) => setPreviousConventionalValue(e.target.value)} />
                </div>
                <div>
                  <Label>Deriva do padrão (calculada)</Label>
                  <Input
                    readOnly
                    className="bg-slate-50"
                    value={computedDrift.valid ? String(computedDrift.value).replace(".", ",") : "—"}
                  />
                  {!computedDrift.valid && computedDrift.reason && weightStatus && (
                    <p className="text-xs text-amber-700 mt-1">{computedDrift.reason}</p>
                  )}
                </div>
              </div>
              {editing && (
                <Button type="button" variant="outline" size="sm" onClick={handleNovaCalibracao} className="w-full sm:w-auto">
                  <ArrowCounterClockwise size={16} className="mr-1" />
                  Nova calibração do peso
                </Button>
              )}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Ue (incerteza expandida)</Label>
                  <Input inputMode="decimal" value={expandedUncertainty} onChange={(e) => setExpandedUncertainty(sanitizeMassNumericInput(e.target.value))} />
                </div>
                <div>
                  <Label>Unidade</Label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
                  >
                    {WEIGHT_ITEM_UNITS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Status calibração</Label>
                  <select
                    value={weightStatus}
                    onChange={(e) => setWeightStatus(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
                  >
                    {WEIGHT_STATUS_OPTIONS.map((o) => (
                      <option key={o.value || "empty"} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="text-xs text-slate-500">
                Deriva: 1ª calibração = Ue; 2ª+ = V.V.C − V.V.C anterior.
              </p>
              <div>
                <Label>Certificado de conjunto (opcional)</Label>
                <select
                  value={weightCertificateId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setWeightCertificateId(id);
                    const cert = weightCerts.find((c) => c.id === id);
                    if (cert?.certificate_number) setCertificateNumber(cert.certificate_number);
                  }}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
                >
                  <option value="">— Nenhum —</option>
                  {weightCerts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {[c.set_name, c.certificate_number].filter(Boolean).join(" — ")}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Nº certificado (texto livre)</Label>
                <Input
                  value={certificateNumber}
                  onChange={(e) => setCertificateNumber(e.target.value)}
                  placeholder="Se não vincular conjunto acima"
                />
              </div>
                </>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button className="bg-blue-600 text-white" onClick={save}>Guardar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
