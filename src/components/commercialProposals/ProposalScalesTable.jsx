import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash } from "@phosphor-icons/react";
import { emptyScale } from "@/lib/commercialProposals/commercialProposalSchema";
import ProposalCalibrationPointsEditor from "./ProposalCalibrationPointsEditor";

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
        {scales.map((scale, index) => (
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
              <div>
                <Label className="text-xs">Capacidade</Label>
                <Input className="mt-1 h-9" value={scale.capacity || ""} onChange={(e) => updateScale(index, { capacity: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Divisão/Res.</Label>
                <Input className="mt-1 h-9" value={scale.resolution || ""} onChange={(e) => updateScale(index, { resolution: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Valor unitário (R$)</Label>
                <Input className="mt-1 h-9" value={scale.unit_value ?? ""} onChange={(e) => updateScale(index, { unit_value: e.target.value })} />
              </div>
            </div>
            <ProposalCalibrationPointsEditor
              points={scale.calibration_points || []}
              onChange={(pts) => updateScale(index, { calibration_points: pts })}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
