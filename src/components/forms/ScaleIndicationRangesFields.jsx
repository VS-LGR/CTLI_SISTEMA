import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sanitizeMassNumericInput } from "@/lib/massValueUtils";

const RANGE_MAPS = {
  registration: [
    { capacity: "capacity_1", resolution: "resolution_1", verification: "verification_division_1", title: "Faixa 1" },
    { capacity: "capacity_2", resolution: "resolution_2", verification: "verification_division_2", title: "Faixa 2" },
    { capacity: "capacity_3", resolution: "resolution_3", verification: "verification_division_3", title: "Faixa 3" },
  ],
  balance: [
    { capacity: "capacidade", resolution: "resolucao", verification: "divisao_verificacao", title: "Faixa 1" },
    { capacity: "capacidade_2", resolution: "resolucao_2", verification: "divisao_verificacao_2", title: "Faixa 2" },
    { capacity: "capacidade_3", resolution: "resolucao_3", verification: "divisao_verificacao_3", title: "Faixa 3" },
  ],
};

function FieldHint({ children }) {
  return <p className="text-[11px] text-slate-500 leading-snug mt-0.5">{children}</p>;
}

/**
 * Campos C / d / e para até 3 faixas de indicação (multi-escala).
 * variant registration → capacity_1… | balance → capacidade…
 */
export default function ScaleIndicationRangesFields({
  variant = "balance",
  values = {},
  onChange,
  includeVerificationDivision = variant === "registration",
  unit = "g",
}) {
  const ranges = RANGE_MAPS[variant] || RANGE_MAPS.balance;
  const unitLabel = unit || "unidade selecionada";
  const set = (key, raw) => onChange(key, sanitizeMassNumericInput(raw));

  return (
    <div className="space-y-4">
      {ranges.length > 1 && (
        <p className="text-[11px] text-slate-500">
          Balanças multi-escala: informe cada faixa em ordem crescente de capacidade
          {" "}(ex.: até 5 {unitLabel} com d=0,005; até 10 {unitLabel} com d=0,01; até 30 {unitLabel} com d=0,1).
          Os cálculos do certificado usam a resolução da faixa correspondente a cada ponto.
        </p>
      )}
      {ranges.map((range, idx) => (
        <div key={range.capacity} className={idx > 0 ? "pt-3 border-t border-slate-100" : ""}>
          {ranges.length > 1 && (
            <p className="text-xs font-semibold text-slate-700 mb-2">
              {range.title}
              {idx > 0 && <span className="font-normal text-slate-500"> (opcional)</span>}
            </p>
          )}
          <div className={`grid gap-3 ${includeVerificationDivision ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
            <div>
              <Label>Indicação máxima (C)</Label>
              <FieldHint>Capacidade máxima desta faixa na unidade selecionada ({unitLabel}).</FieldHint>
              <Input
                inputMode="decimal"
                value={values[range.capacity] || ""}
                onChange={(e) => set(range.capacity, e.target.value)}
                placeholder={idx === 0 ? "Ex.: 5" : "Ex.: 10"}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Resolução (d)</Label>
              <FieldHint>Menor incremento do visor nesta faixa.</FieldHint>
              <Input
                inputMode="decimal"
                value={values[range.resolution] || ""}
                onChange={(e) => set(range.resolution, e.target.value)}
                placeholder={idx === 0 ? "Ex.: 0,005" : "Ex.: 0,01"}
                className="mt-1"
              />
            </div>
            {includeVerificationDivision && (
              <div>
                <Label>Divisão de verificação (e)</Label>
                <FieldHint>Intervalo de escala legal; em geral e = d.</FieldHint>
                <Input
                  inputMode="decimal"
                  value={values[range.verification] || ""}
                  onChange={(e) => set(range.verification, e.target.value)}
                  placeholder="Ex.: 0,005"
                  className="mt-1"
                />
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
