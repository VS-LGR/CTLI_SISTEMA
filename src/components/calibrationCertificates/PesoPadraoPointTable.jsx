import React, { useMemo } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { weightItemCertStatus } from "@/lib/cadastroListUtils";
import { driftFromWeightItem, formatWeightStatus } from "@/lib/standardWeightCalculations";
import { describeWeightComposition } from "@/lib/certificateCalculations/pointCalculations";

function driftCell(item) {
  const d = driftFromWeightItem(item);
  if (!d.valid) return item.standard_drift || "—";
  return String(d.value).replace(".", ",");
}

export default function PesoPadraoPointTable({
  weightItems = [],
  weightCerts = [],
  value = [],
  onChange,
  disabled = false,
  unit = "g",
}) {
  const selected = value || [];

  const composition = useMemo(
    () => describeWeightComposition(selected, weightItems, { targetUnit: unit }),
    [selected, weightItems, unit],
  );

  const toggle = (id) => {
    if (disabled) return;
    const next = selected.includes(id)
      ? selected.filter((x) => x !== id)
      : [...selected, id];
    onChange(next);
  };

  if (!weightItems.length) {
    return (
      <p className="text-sm text-slate-500 p-3 border rounded-md bg-slate-50">
        Cadastre pesos padrão em Cadastros → Pesos padrão (identificação).
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto border rounded-md">
        <table className="w-full text-sm min-w-[720px]">
          <thead className="bg-slate-50 text-left text-xs text-slate-600">
            <tr>
              <th className="p-2 w-10" />
              <th className="p-2">Identificação do Peso Padrão</th>
              <th className="p-2">Valor Nominal</th>
              <th className="p-2">Valor Convencional</th>
              <th className="p-2">Incerteza Expandida</th>
              <th className="p-2">Deriva do Padrão</th>
              <th className="p-2">Status</th>
              <th className="p-2">Situação</th>
            </tr>
          </thead>
          <tbody>
            {weightItems.map((w) => {
              const st = weightItemCertStatus(w, weightCerts);
              const checked = selected.includes(w.id);
              return (
                <tr
                  key={w.id}
                  className={`border-t border-slate-100 ${checked ? "bg-blue-50/40" : ""} ${disabled ? "opacity-70" : ""}`}
                >
                  <td className="p-2 align-middle">
                    <Checkbox
                      checked={checked}
                      disabled={disabled}
                      onCheckedChange={() => toggle(w.id)}
                    />
                  </td>
                  <td className="p-2 font-mono align-middle">{w.identification}</td>
                  <td className="p-2 align-middle">
                    {w.nominal_value || "—"} {w.nominal_value ? w.unit : ""}
                  </td>
                  <td className="p-2 align-middle">
                    {w.conventional_value || "—"} {w.conventional_value ? w.unit : ""}
                  </td>
                  <td className="p-2 align-middle">
                    {w.expanded_uncertainty || "—"} {w.expanded_uncertainty ? w.unit : ""}
                  </td>
                  <td className="p-2 align-middle">{driftCell(w)}</td>
                  <td className="p-2 align-middle text-xs">{formatWeightStatus(w.weight_status)}</td>
                  <td className="p-2 align-middle">
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
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {composition.valid && selected.length > 0 && (
        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 space-y-1">
          {composition.parts.length > 1 && (
            <p>
              <span className="font-medium text-slate-800">Composição (V.N.):</span>{" "}
              <span className="font-mono">{composition.compositionDisplay}</span>
            </p>
          )}
          <p>
            <span className="font-medium text-slate-800">V.N. total (tolerância):</span>{" "}
            <span className="font-mono font-semibold">{composition.totalDisplay}</span>
          </p>
        </div>
      )}
    </div>
  );
}
