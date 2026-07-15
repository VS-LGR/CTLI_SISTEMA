import React, { useState } from "react";
import { CaretDown, CaretRight } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

const MEMORY_FIELDS = [
  { key: "cycle_count", label: "Ciclos (n)", decimals: 0 },
  { key: "mean_deviation", label: "Desvio médio (Δ)", decimals: 6 },
  { key: "measuring_estimate", label: "Estimativa mensurando", decimals: 6 },
  { key: "reference_correction", label: "Correção referência", decimals: 6 },
  { key: "stdev_standards", label: "s (padrão)", decimals: 6 },
  { key: "stdev_measuring", label: "s (mensurando)", decimals: 6 },
  { key: "ue_ppm_uut", label: "ue ppm UUT", decimals: 4 },
  { key: "ue_ppm_ref", label: "ue ppm padrão", decimals: 4 },
  { key: "U95", label: "U95 (bruto)", decimals: 6 },
  { key: "coverage_factor_raw", label: "k (raw)", decimals: 3 },
  { key: "display_expanded", label: "U (exibida)", decimals: 6 },
  { key: "erro_permitido", label: "Erro permitido (3·Ucl)", decimals: 6 },
  { key: "tolerance_positive", label: "Limite superior (G59)", decimals: 6 },
  { key: "tolerance_negative", label: "Limite inferior (G60)", decimals: 6 },
  { key: "valor_encontrado", label: "Valor encontrado (H61)", decimals: 6 },
];

const COMPONENT_LABELS = {
  ua_padrao: "ua (padrão)",
  ua_mensurando: "ua (mensurando)",
  up: "up (incerteza padrão)",
  ud: "ud (deriva)",
  ur: "ur (resolução)",
  ue_mensurando: "ue (empuxo UUT)",
  ue_padrao: "ue (empuxo padrão)",
};

function fmt(value, decimals = 4) {
  if (value == null || value === "") return "—";
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (typeof value === "string" && !/^-?\d/.test(value.trim())) return value;
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value);
  return n.toFixed(decimals).replace(".", ",");
}

/**
 * Painel expansível com memória de cálculo de um item de peso (RE-5.4.2).
 */
export default function WeightItemCalculationMemory({ item }) {
  const [open, setOpen] = useState(false);
  const memory = item?.calculation_memory || {};
  const status = item?.calc_status || "pendente";
  const components = memory.components && typeof memory.components === "object"
    ? memory.components
    : null;

  if (status === "pendente") {
    return <span className="text-[10px] text-slate-400 italic">Pendente</span>;
  }

  if (status === "erro") {
    return (
      <span className="text-[10px] text-red-600" title={item?.calc_error}>
        {item?.calc_error ? "Erro — ver detalhes" : "Erro"}
      </span>
    );
  }

  const hasMemory =
    MEMORY_FIELDS.some((f) => memory[f.key] != null)
    || (components && Object.keys(components).length > 0)
    || item?.conventional_value != null;

  if (!hasMemory) {
    return <span className="text-[10px] text-slate-400">Sem memória</span>;
  }

  return (
    <div className="min-w-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-0.5 text-[10px] sm:text-xs font-medium text-blue-700 hover:text-blue-900"
        aria-expanded={open}
      >
        {open ? <CaretDown size={12} /> : <CaretRight size={12} />}
        Detalhes
      </button>
      {open && (
        <div
          className={cn(
            "mt-2 rounded-md border border-slate-200 bg-slate-50/80 p-2 sm:p-3",
            "grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1.5 text-[10px] sm:text-xs",
            "max-w-md",
          )}
        >
          <div className="flex justify-between gap-2 min-w-0">
            <span className="text-slate-500 truncate">VVC</span>
            <span className="font-mono text-slate-800 shrink-0">{fmt(item.conventional_value, memory.decimals ?? 4)}</span>
          </div>
          <div className="flex justify-between gap-2 min-w-0">
            <span className="text-slate-500 truncate">Desvio</span>
            <span className="font-mono text-slate-800 shrink-0">{fmt(item.deviation, memory.decimals ?? 4)}</span>
          </div>
          <div className="flex justify-between gap-2 min-w-0">
            <span className="text-slate-500 truncate">U expandida</span>
            <span className="font-mono text-slate-800 shrink-0">{fmt(item.expanded_uncertainty, memory.decimals ?? 4)}</span>
          </div>
          <div className="flex justify-between gap-2 min-w-0">
            <span className="text-slate-500 truncate">k</span>
            <span className="font-mono text-slate-800 shrink-0">{fmt(item.coverage_factor, 2)}</span>
          </div>
          {item.specific_density != null && (
            <div className="flex justify-between gap-2 min-w-0">
              <span className="text-slate-500 truncate">Densidade UUT (kg/m³)</span>
              <span className="font-mono text-slate-800 shrink-0">{fmt(item.specific_density, 1)}</span>
            </div>
          )}
          {item.uut_material && (
            <div className="flex justify-between gap-2 min-w-0">
              <span className="text-slate-500 truncate">Material UUT</span>
              <span className="font-mono text-slate-800 shrink-0">{item.uut_material}</span>
            </div>
          )}
          {item.reference_material && (
            <div className="flex justify-between gap-2 min-w-0">
              <span className="text-slate-500 truncate">Material padrão</span>
              <span className="font-mono text-slate-800 shrink-0">{item.reference_material}</span>
            </div>
          )}

          {MEMORY_FIELDS.map((field) => (
            memory[field.key] != null && (
              <div key={field.key} className="flex justify-between gap-2 min-w-0">
                <span className="text-slate-500 truncate">{field.label}</span>
                <span className="font-mono text-slate-800 shrink-0">
                  {fmt(memory[field.key], field.decimals)}
                </span>
              </div>
            )
          ))}

          {memory.assume_class_uncertainty != null && (
            <div className="flex justify-between gap-2 min-w-0">
              <span className="text-slate-500 truncate">Assume U classe</span>
              <span className="font-mono text-slate-800 shrink-0">
                {fmt(memory.assume_class_uncertainty)}
              </span>
            </div>
          )}

          {item.approved != null && (
            <div className="col-span-full flex justify-between gap-2 min-w-0 pt-1 border-t border-slate-200">
              <span className="text-slate-500 truncate">Parecer (G57)</span>
              <span className={`font-mono shrink-0 ${item.approved ? "text-emerald-700" : "text-red-700"}`}>
                {item.approved ? "Aprovado" : "Não aprovado"}
              </span>
            </div>
          )}

          {components && Object.keys(components).length > 0 && (
            <div className="col-span-full pt-1.5 mt-0.5 border-t border-slate-200 space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Componentes de incerteza
              </p>
              {Object.entries(components).map(([key, u]) => (
                <div key={key} className="flex justify-between gap-2 min-w-0">
                  <span className="text-slate-500 truncate">{COMPONENT_LABELS[key] || key}</span>
                  <span className="font-mono text-slate-800 shrink-0">{fmt(u, 6)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
