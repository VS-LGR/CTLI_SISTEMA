import React from "react";
import { Label } from "@/components/ui/label";
import MassValueField from "@/components/forms/MassValueField";
import { sanitizeMassNumericInput } from "@/lib/massValueUtils";
import { formatMassDisplay } from "@/lib/massValueUtils";

export default function ProposalCalibrationPointsEditor({ points = [], onChange, defaultUnit = "g" }) {
  const updatePoint = (index, patch) => {
    const next = points.map((p, i) => (i === index ? { ...p, ...patch } : p));
    onChange(next);
  };

  const filled = points.filter((p) => String(p.nominal_value || "").trim());
  if (!points.length) return null;

  return (
    <div>
      <Label className="text-xs">Pontos de calibração (até 10)</Label>
      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {points.map((p, i) => (
          <div key={p.point_number ?? i + 1}>
            <Label className="text-[10px] text-slate-500">P{p.point_number ?? i + 1}</Label>
            <MassValueField
              compact
              className="mt-0.5"
              value={p.nominal_value || ""}
              unit={p.nominal_unit || defaultUnit}
              defaultUnit={defaultUnit}
              onValueChange={(v) => updatePoint(i, { nominal_value: sanitizeMassNumericInput(v) })}
              onUnitChange={(u) => updatePoint(i, { nominal_unit: u })}
            />
          </div>
        ))}
      </div>
      {filled.length > 0 && (
        <p className="text-xs text-slate-500 mt-2">
          Resumo: {filled.map((p) => formatMassDisplay(p.nominal_value, p.nominal_unit || defaultUnit, { fallback: "" })).filter(Boolean).join(", ")}
        </p>
      )}
    </div>
  );
}
