import React from "react";
import { Info } from "@phosphor-icons/react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/** Referência visual da ordem de calibração — só no formulário (não entra no PDF). */
export const CALIBRACAO_ORDEM_IMAGES = [
  {
    src: "/CircularaCTLI.webp",
    alt: "Ordem de calibração — plataforma circular",
    label: "Circular",
    platformValues: ["redondo"],
  },
  {
    src: "/QuadradaCTLI.webp",
    alt: "Ordem de calibração — plataforma retangular ou quadrada",
    label: "Retangular ou quadrada",
    platformValues: ["retangular_quadrada"],
  },
  {
    src: "/FerroviariaCTLI.webp",
    alt: "Ordem de calibração — plataforma ferroviária",
    label: "Ferroviária",
    platformValues: ["ferroviaria"],
  },
];

export default function CalibracaoOrdemTooltip({ tipoPlataforma = "" }) {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 shadow-sm hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-label="Ver ordem de calibração conforme o formato da plataforma"
          >
            <Info size={16} weight="duotone" className="text-blue-600 shrink-0" />
            <span className="hidden sm:inline">Ordem dos pontos</span>
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="bottom"
          align="end"
          sideOffset={8}
          className="max-w-[min(94vw,42rem)] border border-slate-200 bg-white p-3 text-slate-900 shadow-lg"
        >
          <p className="text-xs font-semibold text-slate-800 mb-2 pr-1">
            Ordem de calibração conforme o formato da plataforma
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {CALIBRACAO_ORDEM_IMAGES.map((item) => {
              const active = item.platformValues.includes(tipoPlataforma);
              return (
                <figure
                  key={item.src}
                  className={cn(
                    "rounded-md border p-2 transition-colors",
                    active ? "border-blue-400 bg-blue-50/80 ring-1 ring-blue-200" : "border-slate-200 bg-slate-50/50",
                  )}
                >
                  <img
                    src={item.src}
                    alt={item.alt}
                    width={200}
                    height={200}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-auto rounded object-contain"
                  />
                  <figcaption className="mt-1.5 text-center text-[11px] font-medium text-slate-700">
                    {item.label}
                  </figcaption>
                </figure>
              );
            })}
          </div>
          <p className="mt-2 text-[10px] text-slate-500 leading-snug">
            Selecione o tipo de plataforma na secção 2 para destacar o diagrama correspondente.
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
