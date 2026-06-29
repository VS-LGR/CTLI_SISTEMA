import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Plus, Trash } from "@phosphor-icons/react";
import {
  emptyScale,
  CLIENT_REQUESTED_POINTS_OPTIONS,
} from "@/lib/commercialProposals/commercialProposalSchema";
import { MASS_UNIT_OPTIONS } from "@/lib/massValueUtils";
import { sanitizeMassNumericInput } from "@/lib/massValueUtils";
import ProposalCalibrationPointsEditor from "./ProposalCalibrationPointsEditor";

function ClientPointsRadio({ value, onChange }) {
  return (
    <div>
      <Label className="text-xs text-slate-600 mb-2 block">
        Pontos de calibração solicitados pelo cliente
      </Label>
      <RadioGroup value={value || ""} onValueChange={onChange} className="flex flex-wrap gap-4">
        {CLIENT_REQUESTED_POINTS_OPTIONS.map((o) => (
          <div className="flex items-center gap-1.5" key={o.value}>
            <RadioGroupItem value={o.value} id={`client-pts-${o.value}`} />
            <Label htmlFor={`client-pts-${o.value}`} className="text-sm font-normal cursor-pointer">
              {o.label}
            </Label>
          </div>
        ))}
      </RadioGroup>
    </div>
  );
}

export default function ProposalScalesTable({ scales, onChange }) {
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
                    onChange={(e) => updateScale(index, { unit: e.target.value })}
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
              <ClientPointsRadio
                value={scale.client_requested_points}
                onChange={(v) => updateScale(index, { client_requested_points: v })}
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
