import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sanitizeMassNumericInput } from "@/lib/massValueUtils";
import { formValuesFromPointMaxTolerances } from "@/lib/scaleRegistrations/scaleRegistrationUtils";

export default function PointMaxToleranceFields({
  tolerances = [],
  onChange,
  unit = "g",
  readOnly = false,
  className = "",
}) {
  const formValues = formValuesFromPointMaxTolerances(tolerances);

  const setPoint = (point, raw) => {
    if (readOnly || !onChange) return;
    const next = Array.from({ length: 10 }, (_, i) => {
      const p = i + 1;
      const key = `point_max_tolerance_p${p}`;
      return {
        point: p,
        value: p === point ? sanitizeMassNumericInput(raw) : (formValues[key] ?? ""),
      };
    }).filter((p) => String(p.value).trim() !== "");
    onChange(next);
  };

  return (
    <div className={className}>
      <p className="text-xs text-slate-600 mb-2">
        Limite máximo de |Erro + Incerteza| na emissão do certificado
        {unit ? ` (${unit})` : ""}.
      </p>
      <div className="grid grid-cols-5 gap-2">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
          <div key={n}>
            <Label className="text-[10px] text-slate-600">Tol. máx. P{n}</Label>
            <Input
              inputMode="decimal"
              readOnly={readOnly}
              value={formValues[`point_max_tolerance_p${n}`] ?? ""}
              onChange={(e) => setPoint(n, e.target.value)}
              className="h-8 text-sm mt-0.5"
              placeholder="—"
              title={`Tolerância máxima |E+U| para o ponto P${n}`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
