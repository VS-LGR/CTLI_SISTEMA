import React, { useState } from "react";
import { CaretDown, CaretRight } from "@phosphor-icons/react";
import { formatCalcDisplay } from "@/lib/certificateCalculations";
import { cn } from "@/lib/utils";

const MEMORY_FIELDS = [
  { key: "average", label: "Média (L)" },
  { key: "indicationError", label: "Erro de indicação (E)" },
  { key: "errorBeforeAdjustment", label: "Erro antes do ajuste" },
  { key: "repeatability", label: "Repetitividade (u_rep)", decimals: 6 },
  { key: "resolutionContribution", label: "Contrib. resolução (u_res)", decimals: 6 },
  { key: "standardContribution", label: "Contrib. padrão (u_pad)", decimals: 6 },
  { key: "indicationContribution", label: "Contrib. indicação (u_ind)", decimals: 6 },
  { key: "combinedUncertainty", label: "Incerteza combinada (u_c)", decimals: 6 },
  { key: "degreesOfFreedom", label: "Graus de liberdade (ν_eff)", decimals: 2 },
  { key: "coverageFactor", label: "Fator k", decimals: 2 },
  { key: "expandedUncertainty", label: "Incerteza expandida (U)", decimals: 4 },
];

function formatMemoryValue(value, decimals = 4) {
  if (value == null || value === "") return "—";
  return formatCalcDisplay(value, decimals);
}

export default function PointCalculationMemory({ point }) {
  const [open, setOpen] = useState(false);
  const memory = point?.calculation_memory || {};
  const status = point?.calc_status || "pendente";

  if (status === "pendente") {
    return (
      <span className="text-[10px] text-slate-400 italic">Pendente</span>
    );
  }

  if (status === "erro") {
    return (
      <span className="text-[10px] text-red-600" title={point?.calc_error}>
        Erro
      </span>
    );
  }

  const hasMemory = MEMORY_FIELDS.some((f) => memory[f.key] != null);

  if (!hasMemory) {
    return (
      <button
        type="button"
        className="text-[10px] text-blue-600 hover:underline"
        onClick={() => setOpen(!open)}
      >
        Sem memória
      </button>
    );
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
            "grid grid-cols-1 xs:grid-cols-2 gap-x-3 gap-y-1.5 text-[10px] sm:text-xs",
          )}
        >
          {MEMORY_FIELDS.map((field) => (
            <div key={field.key} className="flex justify-between gap-2 min-w-0">
              <span className="text-slate-500 truncate">{field.label}</span>
              <span className="font-mono text-slate-800 shrink-0">
                {formatMemoryValue(memory[field.key], field.decimals)}
              </span>
            </div>
          ))}
          {memory.readingCount != null && (
            <div className="col-span-full pt-1 border-t border-slate-200 text-slate-500">
              Leituras utilizadas: {memory.readingCount}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
