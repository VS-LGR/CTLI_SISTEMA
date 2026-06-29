import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export default function ProposalCalibrationPointsEditor({ points = [], onChange }) {
  const updatePoint = (index, value) => {
    const next = points.map((p, i) => (i === index ? { ...p, nominal_value: value } : p));
    onChange(next);
  };

  const filled = points.filter((p) => String(p.nominal_value || "").trim());
  if (!points.length) return null;

  return (
    <div>
      <Label className="text-xs">Pontos de calibração (até 10)</Label>
      <div className="mt-2 grid grid-cols-2 sm:grid-cols-5 gap-2">
        {points.map((p, i) => (
          <div key={p.point_number ?? i + 1}>
            <Label className="text-[10px] text-slate-500">P{p.point_number ?? i + 1}</Label>
            <Input
              className="mt-0.5 h-8 text-xs"
              placeholder="ex: 100 g"
              value={p.nominal_value || ""}
              onChange={(e) => updatePoint(i, e.target.value)}
            />
          </div>
        ))}
      </div>
      {filled.length > 0 && (
        <p className="text-xs text-slate-500 mt-2">
          Resumo: {filled.map((p) => p.nominal_value).join(", ")}
        </p>
      )}
    </div>
  );
}
