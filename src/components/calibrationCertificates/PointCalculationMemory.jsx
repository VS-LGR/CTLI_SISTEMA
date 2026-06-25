import React, { useState } from "react";
import { CaretDown, CaretRight } from "@phosphor-icons/react";
import { formatCalcDisplay } from "@/lib/certificateCalculations";
import { cn } from "@/lib/utils";

const MEMORY_FIELDS = [
  { key: "average", label: "Média (L) — calc.", decimals: 6 },
  { key: "referenceValue", label: "V.R. — calc.", decimals: 6 },
  { key: "weightReference", label: "VVC pesos (sem lote)", decimals: 6 },
  { key: "indicationError", label: "Erro (E) — calc.", decimals: 6 },
  { key: "errorBeforeAdjustment", label: "Erro antes do ajuste", decimals: 6 },
  { key: "ua", label: "Repetitividade (ua)", decimals: 6 },
  { key: "up", label: "Padrão (up)", decimals: 6 },
  { key: "ud", label: "Deriva (ud)", decimals: 6 },
  { key: "ue", label: "Empuxo (ue)", decimals: 6 },
  { key: "ur", label: "Resolução (ur)", decimals: 6 },
  { key: "upLC", label: "Lote de carga (upLC)", decimals: 6 },
  { key: "upLcSource", label: "Fonte upLC" },
  { key: "load_batch_formation", label: "Formação lote" },
  { key: "combinedUncertainty", label: "Incerteza combinada (uc)", decimals: 6 },
  { key: "degreesOfFreedom", label: "Graus de liberdade (Veff)", decimals: 2 },
  { key: "coverageFactor", label: "Fator k", decimals: 2 },
  { key: "expandedUncertainty", label: "Incerteza expandida (U) — calc.", decimals: 6 },
  { key: "averageDisplay", label: "Média — exibida", decimals: 4 },
  { key: "referenceDisplay", label: "V.R. — exibida", decimals: 4 },
  { key: "indicationErrorDisplay", label: "Erro (E) — exibido", decimals: 4 },
  { key: "expandedUncertaintyDisplay", label: "Incerteza expandida (U) — exibida", decimals: 4 },
  { key: "veffDisplay", label: "Veff — exibido" },
];

function formatMemoryValue(value, decimals = 4) {
  if (value == null || value === "") return "—";
  if (typeof value === "string" && !/^-?\d/.test(value.trim())) return value;
  return formatCalcDisplay(value, decimals);
}

function TraceSteps({ steps = [] }) {
  if (!steps.length) return null;
  return (
    <div className="col-span-full mt-2 pt-2 border-t border-slate-200 space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Rastreio de cálculo</p>
      {steps.map((step) => (
        <div key={step.id} className="rounded border border-slate-100 bg-white/80 p-2 space-y-0.5">
          <p className="text-[10px] font-medium text-slate-700">{step.label}</p>
          {step.formula && (
            <p className="text-[10px] text-slate-500 font-mono">{step.formula}</p>
          )}
          {step.expression && (
            <p className="text-[10px] text-blue-800 font-mono break-all">{step.expression}</p>
          )}
          {step.result != null && step.result !== "" && (
            <p className="text-[10px] text-slate-800">
              → <span className="font-mono font-semibold">{formatMemoryValue(step.result, 6)}</span>
              {step.unit ? ` ${step.unit}` : ""}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

export default function PointCalculationMemory({ point, showTrace = false }) {
  const [open, setOpen] = useState(false);
  const memory = point?.calculation_memory || {};
  const status = point?.calc_status || "pendente";
  const traceSteps = memory.calculationTrace || [];

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

  const hasMemory = MEMORY_FIELDS.some((f) => memory[f.key] != null) || traceSteps.length;

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
            memory[field.key] != null && (
              <div key={field.key} className="flex justify-between gap-2 min-w-0">
                <span className="text-slate-500 truncate">{field.label}</span>
                <span className="font-mono text-slate-800 shrink-0">
                  {formatMemoryValue(memory[field.key], field.decimals)}
                </span>
              </div>
            )
          ))}
          {memory.readingCount != null && (
            <div className="col-span-full pt-1 border-t border-slate-200 text-slate-500">
              Leituras utilizadas: {memory.readingCount}
            </div>
          )}
          {showTrace && <TraceSteps steps={traceSteps} />}
        </div>
      )}
    </div>
  );
}
