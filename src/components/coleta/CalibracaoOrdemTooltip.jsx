import React, { useEffect, useMemo, useState } from "react";
import { Info } from "@phosphor-icons/react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { APP_LOGO, APP_NAME } from "@/lib/appBranding";

/** Diagramas de ordem de calibração por formato de plataforma (não entra no PDF). */
export const CALIBRACAO_ORDEM_IMAGES = [
  {
    src: "/RedondaBalanças.webp",
    alt: "Ordem de calibração — plataforma circular",
    label: "Circular",
    platformValues: ["redondo"],
  },
  {
    src: "/Quadrada ou retangularBalanças.webp",
    alt: "Ordem de calibração — plataforma retangular ou quadrada",
    label: "Retangular ou quadrada",
    platformValues: ["retangular_quadrada"],
  },
  {
    src: "/RodoviariaBalanças.webp",
    alt: "Ordem de calibração — plataforma ferroviária",
    label: "Ferroviária",
    platformValues: ["ferroviaria"],
  },
];

export default function CalibracaoOrdemTooltip({ tipoPlataforma = "" }) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px), (pointer: coarse)");
    const update = () => setIsMobile(Boolean(mq.matches));
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);

  const content = useMemo(() => (
    <>
      <p className="text-xs font-semibold text-foreground mb-2 pr-1">
        Validação dos pontos de pesagem (ordem por formato da plataforma)
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {CALIBRACAO_ORDEM_IMAGES.map((item) => {
          const active = item.platformValues.includes(tipoPlataforma);
          return (
            <figure
              key={item.src}
              className={cn(
                "rounded-md border p-2 transition-colors",
                active ? "border-primary bg-primary/10 ring-1 ring-primary/30" : "border-border bg-background/50",
              )}
            >
              <img
                src={item.src}
                alt={item.alt}
                width={240}
                height={240}
                loading="lazy"
                decoding="async"
                className="w-full h-auto rounded object-contain"
              />
              <figcaption className="mt-1.5 text-center text-[11px] font-medium text-foreground/90">
                {item.label}
              </figcaption>
            </figure>
          );
        })}
      </div>
      <p className="mt-2 text-[10px] text-muted-foreground leading-snug">
        Selecione o tipo de plataforma na secção 2 para destacar o diagrama correspondente.
      </p>
      <div className="mt-3 pt-2 border-t border-border flex items-center justify-end gap-2">
        <img src={APP_LOGO} alt="" aria-hidden className="h-5 w-5 object-contain rounded-sm bg-black" />
        <span className="text-[9px] uppercase tracking-wide text-muted-foreground">{APP_NAME}</span>
      </div>
    </>
  ), [tipoPlataforma]);

  const trigger = (
    <button
      type="button"
      className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground shadow-sm hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label="Ver validação dos pontos de pesagem"
    >
      <Info size={16} weight="duotone" className="text-primary shrink-0" />
      <span className="hidden sm:inline">Ordem dos pontos</span>
      <span className="sm:hidden">Pontos</span>
    </button>
  );

  // Celular: abre pop-up (Dialog) para melhor validação (sem hover).
  if (isMobile) {
    return (
      <Dialog>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-base sm:text-lg">
              Validação dos pontos de pesagem
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Use o diagrama correspondente ao formato da plataforma para confirmar a ordem dos pontos.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto pr-1">
            {content}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Desktop: tooltip para consulta rápida.
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>{trigger}</TooltipTrigger>
        <TooltipContent
          side="bottom"
          align="end"
          sideOffset={8}
          className="max-w-[min(94vw,42rem)] border border-border bg-card p-3 text-foreground shadow-lg"
        >
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
