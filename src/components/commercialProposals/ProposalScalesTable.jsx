import React, { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Plus, Trash, FloppyDisk } from "@phosphor-icons/react";
import { toast } from "sonner";
import {
  emptyScale,
  CLIENT_REQUESTED_POINTS_OPTIONS,
} from "@/lib/commercialProposals/commercialProposalSchema";
import { MASS_UNIT_OPTIONS } from "@/lib/massValueUtils";
import { sanitizeMassNumericInput } from "@/lib/massValueUtils";
import { scaleToBalanca } from "@/lib/commercialProposals/commercialProposalCadastroExport";
import { createScaleRegistrationFromBalance } from "@/lib/scaleRegistrations/scaleRegistrationApi";
import ProposalCalibrationPointsEditor from "./ProposalCalibrationPointsEditor";

function ClientPointsRadio({ value, onChange, idPrefix }) {
  return (
    <div>
      <Label className="text-xs text-slate-600 mb-2 block">
        Pontos de calibração solicitados pelo cliente
      </Label>
      <RadioGroup value={value || ""} onValueChange={onChange} className="flex flex-wrap gap-4">
        {CLIENT_REQUESTED_POINTS_OPTIONS.map((o) => (
          <div className="flex items-center gap-1.5" key={o.value}>
            <RadioGroupItem value={o.value} id={`${idPrefix}-${o.value}`} />
            <Label htmlFor={`${idPrefix}-${o.value}`} className="text-sm font-normal cursor-pointer">
              {o.label}
            </Label>
          </div>
        ))}
      </RadioGroup>
    </div>
  );
}

function proposalFieldsFromRegistration(reg) {
  if (!reg) return {};
  return {
    manufacturer: reg.manufacturer || "",
    model: reg.model || "",
    tag: reg.tag || "",
    serial_number: reg.serial_number || "",
    capacity: reg.capacity_1 || "",
    resolution: reg.resolution_1 || "",
    unit: reg.unit || "g",
    scale_registration_id: reg.id,
  };
}

export default function ProposalScalesTable({
  scales,
  onChange,
  endCustomerId = "",
  registeredScales = [],
  tenantId = "",
  onRegisteredScaleCreated,
}) {
  const [savingIndex, setSavingIndex] = useState(null);

  const scaleList = endCustomerId
    ? registeredScales.filter((s) => s.end_customer_id === endCustomerId || !s.end_customer_id)
    : registeredScales;

  const updateScale = (index, patch) => {
    const next = scales.map((s, i) => (i === index ? { ...s, ...patch } : s));
    onChange(next);
  };

  const addScale = () => {
    onChange([...scales, emptyScale(scales.length + 1)]);
  };

  const removeScale = (index) => {
    if (scales.length <= 1) return;
    const next = scales.filter((_, i) => i !== index).map((s, i) => ({ ...s, item_number: i + 1 }));
    onChange(next);
  };

  const applyRegistration = (index, registrationId) => {
    if (registrationId === "__manual__" || !registrationId) {
      updateScale(index, { scale_registration_id: "" });
      return;
    }
    const reg = registeredScales.find((s) => s.id === registrationId);
    if (!reg) return;
    const fields = proposalFieldsFromRegistration(reg);
    const unit = fields.unit || "g";
    const pts = (scales[index]?.calibration_points || []).map((p) => ({
      ...p,
      nominal_unit: p.nominal_unit || unit,
    }));
    updateScale(index, { ...fields, calibration_points: pts });
  };

  const registerScale = async (index) => {
    const scale = scales[index];
    if (!tenantId) return toast.error("Selecione um ambiente");
    if (!endCustomerId) return toast.error("Selecione um cliente para vincular a balança");
    if (!String(scale?.serial_number || "").trim()) {
      return toast.error("Informe o número de série da balança");
    }
    setSavingIndex(index);
    try {
      const saved = await createScaleRegistrationFromBalance({
        tenantId,
        endCustomerId,
        balanca: scaleToBalanca(scale),
      });
      updateScale(index, { scale_registration_id: saved.id });
      onRegisteredScaleCreated?.(saved);
      toast.success("Balança cadastrada no cliente");
    } catch (e) {
      toast.error(e.message || "Falha ao cadastrar balança");
    } finally {
      setSavingIndex(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-800">Balanças</h3>
        <Button type="button" variant="outline" size="sm" onClick={addScale}>
          <Plus size={16} className="mr-1" /> Adicionar balança
        </Button>
      </div>

      <div className="space-y-4">
        {scales.map((scale, index) => {
          const scaleUnit = scale.unit || "g";
          const linked = Boolean(scale.scale_registration_id);
          return (
            <div key={scale.id || `scale-${index}`} className="rounded-lg border border-slate-200 p-4 space-y-3 bg-white">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-600 uppercase">Balança {index + 1}</span>
                {scales.length > 1 && !scale.collection_id && (
                  <Button type="button" variant="ghost" size="sm" className="text-red-600" onClick={() => removeScale(index)}>
                    <Trash size={16} />
                  </Button>
                )}
              </div>

              <div>
                <Label className="text-xs">Balança (cadastro)</Label>
                <select
                  value={scale.scale_registration_id || "__manual__"}
                  onChange={(e) => applyRegistration(index, e.target.value)}
                  className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm shadow-sm"
                >
                  <option value="__manual__">— Preencher manualmente —</option>
                  {scaleList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.serial_number || s.tag || "Sem série"} — {s.manufacturer} {s.model}
                    </option>
                  ))}
                </select>
                {!registeredScales.length && (
                  <p className="text-xs text-amber-700 mt-1">
                    Cadastre balanças em PR-7.1 → Balanças para selecionar aqui.
                  </p>
                )}
                {endCustomerId && !scaleList.length && registeredScales.length > 0 && (
                  <p className="text-xs text-slate-500 mt-1">
                    Nenhuma balança vinculada a este cliente. Preencha manualmente ou selecione outra.
                  </p>
                )}
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <Label className="text-xs">Marca/Fabricante</Label>
                  <Input className="mt-1 h-9" value={scale.manufacturer || ""} onChange={(e) => updateScale(index, { manufacturer: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Modelo</Label>
                  <Input className="mt-1 h-9" value={scale.model || ""} onChange={(e) => updateScale(index, { model: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Tag</Label>
                  <Input className="mt-1 h-9" value={scale.tag || ""} onChange={(e) => updateScale(index, { tag: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Série *</Label>
                  <Input className="mt-1 h-9" value={scale.serial_number || ""} onChange={(e) => updateScale(index, { serial_number: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-12 gap-3 items-end">
                <div className="col-span-12 sm:col-span-4">
                  <Label className="text-xs">Capacidade</Label>
                  <Input
                    inputMode="decimal"
                    className="mt-1 h-9"
                    value={scale.capacity || ""}
                    onChange={(e) => updateScale(index, { capacity: sanitizeMassNumericInput(e.target.value) })}
                  />
                </div>
                <div className="col-span-12 sm:col-span-4">
                  <Label className="text-xs">Divisão/Res.</Label>
                  <Input
                    inputMode="decimal"
                    className="mt-1 h-9"
                    value={scale.resolution || ""}
                    onChange={(e) => updateScale(index, { resolution: sanitizeMassNumericInput(e.target.value) })}
                  />
                </div>
                <div className="col-span-12 sm:col-span-2">
                  <Label className="text-xs">Unidade</Label>
                  <select
                    value={scaleUnit}
                    onChange={(e) => {
                      const unit = e.target.value;
                      const pts = (scale.calibration_points || []).map((p) => ({
                        ...p,
                        nominal_unit: unit,
                      }));
                      updateScale(index, { unit, calibration_points: pts });
                    }}
                    className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm shadow-sm"
                  >
                    {MASS_UNIT_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-12 sm:col-span-2">
                  <Label className="text-xs">Valor unitário (R$)</Label>
                  <Input className="mt-1 h-9" value={scale.unit_value ?? ""} onChange={(e) => updateScale(index, { unit_value: e.target.value })} />
                </div>
              </div>

              {!linked && (
                <div className="space-y-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={savingIndex === index}
                    onClick={() => registerScale(index)}
                  >
                    <FloppyDisk size={16} className="mr-1.5" />
                    {savingIndex === index ? "A cadastrar…" : "Cadastrar balança no cliente"}
                  </Button>
                  {!endCustomerId && (
                    <p className="text-xs text-amber-700">Selecione o cliente para cadastrar a balança.</p>
                  )}
                </div>
              )}

              <ClientPointsRadio
                value={scale.client_requested_points}
                onChange={(v) => updateScale(index, { client_requested_points: v })}
                idPrefix={`client-pts-${index}`}
              />
              <ProposalCalibrationPointsEditor
                points={scale.calibration_points || []}
                defaultUnit={scaleUnit}
                onChange={(pts) => updateScale(index, { calibration_points: pts })}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
