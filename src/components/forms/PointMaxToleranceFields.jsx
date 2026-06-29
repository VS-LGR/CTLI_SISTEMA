import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Trash } from "@phosphor-icons/react";
import { sanitizeMassNumericInput, MASS_UNIT_OPTIONS, normalizeMassUnit } from "@/lib/massValueUtils";
import {
  MAX_TOLERANCE_ENTRY_COUNT,
  normalizePointMaxTolerances,
} from "@/lib/certificateCalculations/pointMaxToleranceVerification";
import { formRowsFromPointMaxTolerances } from "@/lib/scaleRegistrations/scaleRegistrationUtils";

export default function PointMaxToleranceFields({
  tolerances = [],
  onChange,
  unit = "g",
  readOnly = false,
  className = "",
}) {
  const defaultUnit = normalizeMassUnit(unit, "g");
  const rows = formRowsFromPointMaxTolerances(tolerances, defaultUnit);
  const legacyCount = normalizePointMaxTolerances(tolerances).filter((e) => e._legacyPoint).length;

  const emit = (nextRows) => {
    if (readOnly || !onChange) return;
    onChange(
      nextRows.map((row) => ({
        nominal_value: String(row.nominal_value ?? ""),
        unit: normalizeMassUnit(row.unit, defaultUnit),
        max_tolerance: String(row.max_tolerance ?? ""),
      })),
    );
  };

  const updateRow = (index, patch) => {
    const next = rows.map((row, i) => (i === index ? { ...row, ...patch } : row));
    emit(next);
  };

  const addRow = () => {
    if (rows.length >= MAX_TOLERANCE_ENTRY_COUNT) return;
    emit([...rows, { nominal_value: "", unit: defaultUnit, max_tolerance: "" }]);
  };

  const removeRow = (index) => {
    const next = rows.filter((_, i) => i !== index);
    emit(next.length ? next : [{ nominal_value: "", unit: defaultUnit, max_tolerance: "" }]);
  };

  return (
    <div className={className}>
      <p className="text-xs text-slate-600 mb-2">
        Limite máximo de |Erro + Incerteza| por valor de pesagem calibrado.
        Tolerância na mesma unidade do erro/incerteza no certificado.
      </p>
      {legacyCount > 0 && (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-2 py-1.5 mb-2">
          Existem {legacyCount} tolerância(s) legadas por número de ponto (P1–P10).
          Cadastre novamente por valor de pesagem para aplicar a regra atual.
        </p>
      )}
      <div className="overflow-x-auto -mx-1 px-1">
        <table className="w-full text-xs min-w-[420px]">
          <thead>
            <tr className="text-[10px] uppercase text-slate-500 border-b border-slate-200">
              <th className="py-1.5 pr-2 text-left font-medium">Pesagem (V.R.)</th>
              <th className="py-1.5 px-2 text-left font-medium w-16">Un.</th>
              <th className="py-1.5 px-2 text-left font-medium">Tol. máx. |E+U|</th>
              {!readOnly && <th className="py-1.5 pl-2 w-8" />}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`tol-row-${index}`} className="border-b border-slate-100 last:border-0">
                <td className="py-1.5 pr-2">
                  <Input
                    inputMode="decimal"
                    readOnly={readOnly}
                    value={row.nominal_value ?? ""}
                    onChange={(e) => updateRow(index, { nominal_value: sanitizeMassNumericInput(e.target.value) })}
                    className="h-8 text-sm"
                    placeholder="ex.: 300"
                  />
                </td>
                <td className="py-1.5 px-2">
                  <select
                    value={normalizeMassUnit(row.unit, defaultUnit)}
                    disabled={readOnly}
                    onChange={(e) => updateRow(index, { unit: e.target.value })}
                    className="flex h-8 w-full min-w-[3.5rem] rounded-md border border-input bg-transparent px-1.5 text-xs shadow-sm"
                    aria-label={`Unidade da pesagem linha ${index + 1}`}
                  >
                    {MASS_UNIT_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </td>
                <td className="py-1.5 px-2">
                  <Input
                    inputMode="decimal"
                    readOnly={readOnly}
                    value={row.max_tolerance ?? ""}
                    onChange={(e) => updateRow(index, { max_tolerance: sanitizeMassNumericInput(e.target.value) })}
                    className="h-8 text-sm"
                    placeholder="ex.: 0,6"
                  />
                </td>
                {!readOnly && (
                  <td className="py-1.5 pl-2 text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-slate-400 hover:text-red-600"
                      onClick={() => removeRow(index)}
                      disabled={rows.length <= 1 && !row.nominal_value && !row.max_tolerance}
                      aria-label="Remover linha"
                    >
                      <Trash size={14} />
                    </Button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!readOnly && rows.length < MAX_TOLERANCE_ENTRY_COUNT && (
        <Button type="button" variant="outline" size="sm" className="mt-2 h-8 text-xs" onClick={addRow}>
          <Plus size={14} className="mr-1" /> Adicionar pesagem
        </Button>
      )}
    </div>
  );
}
