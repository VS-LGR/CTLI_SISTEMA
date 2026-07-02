import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import MassValueField from "@/components/forms/MassValueField";
import CalibracaoOrdemTooltip from "@/components/coleta/CalibracaoOrdemTooltip";
import { syncEccValorAplicado, sanitizeMassNumericInput } from "@/lib/coletaSchema";

/**
 * Ensaio de excentricidade — RE-7.2A / certificado manual.
 * Mesma estrutura de payload.excentricidade da coleta.
 */
export default function EccentricityTestFields({
  excentricidade = {},
  tipoPlataforma = "",
  defaultUnit = "g",
  onChange,
  disabled = false,
}) {
  const notApplicable = tipoPlataforma === "excentricidade_na";
  const pontos = excentricidade.pontos || [];

  const emit = (next) => onChange?.(next);

  const setEccPonto = (idx, key, value) => {
    const nextPontos = [...pontos];
    nextPontos[idx] = {
      ...nextPontos[idx],
      [key]: sanitizeMassNumericInput(value),
    };
    emit({ ...excentricidade, pontos: nextPontos });
  };

  const syncValorAplicado = (patch) => {
    emit(syncEccValorAplicado({ ...excentricidade, ...patch }, defaultUnit));
  };

  if (notApplicable) {
    return (
      <p className="text-sm text-slate-600">
        Excentricidade não aplicável para o tipo de plataforma selecionado.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <Label className="text-xs">Valor aplicado</Label>
          <div className="mt-1 max-w-xs">
            <MassValueField
              value={excentricidade.valor_aplicado_valor || ""}
              unit={excentricidade.valor_aplicado_unidade || defaultUnit}
              defaultUnit={defaultUnit}
              disabled={disabled}
              onValueChange={(v) => syncValorAplicado({ valor_aplicado_valor: v })}
              onUnitChange={(u) => syncValorAplicado({ valor_aplicado_unidade: u })}
            />
          </div>
        </div>
        <CalibracaoOrdemTooltip tipoPlataforma={tipoPlataforma} />
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-sm min-w-[20rem]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="p-2 text-left font-semibold w-12">Ponto</th>
              <th className="p-2 text-left font-semibold">Antes do ajuste</th>
              <th className="p-2 text-left font-semibold">Depois do ajuste</th>
            </tr>
          </thead>
          <tbody>
            {pontos.map((pt, i) => (
              <tr key={i} className="border-b border-slate-100 last:border-0">
                <td className="p-2 font-mono text-slate-600">{i + 1}</td>
                <td className="p-2">
                  <Input
                    value={pt.antes || ""}
                    disabled={disabled}
                    onChange={(e) => setEccPonto(i, "antes", e.target.value)}
                    className="h-9"
                  />
                </td>
                <td className="p-2">
                  <Input
                    value={pt.depois || ""}
                    disabled={disabled}
                    onChange={(e) => setEccPonto(i, "depois", e.target.value)}
                    className="h-9"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500">
        Os 5 primeiros pontos aparecem no certificado. Preencha conforme a ordem de calibração da plataforma.
      </p>
    </div>
  );
}
