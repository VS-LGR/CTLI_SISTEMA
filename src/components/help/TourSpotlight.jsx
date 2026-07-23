import React, { useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { HELP_PATH } from "@/lib/help/helpModules";

const PAD = 8;

function measure(el) {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width < 2 && r.height < 2) return null;
  return {
    top: r.top - PAD,
    left: r.left - PAD,
    width: r.width + PAD * 2,
    height: r.height + PAD * 2,
    bottom: r.bottom + PAD,
    right: r.right + PAD,
  };
}

/**
 * Destaca um botão/área da página (data-tour) e mostra o cartão do passo ao lado.
 */
export default function TourSpotlight({
  open,
  highlightId,
  title,
  stepTitle,
  stepBody,
  stepIndex,
  total,
  isFirst,
  isLast,
  onStepChange,
  onDismiss,
}) {
  const [rect, setRect] = useState(null);
  const [placement, setPlacement] = useState("below");

  useLayoutEffect(() => {
    if (!open || !highlightId) {
      setRect(null);
      return undefined;
    }
    const el = document.querySelector(`[data-tour="${highlightId}"]`);
    if (!el) {
      setRect(null);
      return undefined;
    }

    el.classList.add("tour-spotlight-target");
    el.scrollIntoView({ block: "center", behavior: "smooth", inline: "nearest" });

    const update = () => {
      const next = measure(el);
      setRect(next);
      if (next) {
        const spaceBelow = window.innerHeight - next.bottom;
        setPlacement(spaceBelow < 220 && next.top > 220 ? "above" : "below");
      }
    };
    update();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    ro?.observe(el);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);

    return () => {
      el.classList.remove("tour-spotlight-target");
      ro?.disconnect();
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, highlightId, stepIndex]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onDismiss?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onDismiss]);

  if (!open || !rect) return null;

  const cardStyle = placement === "above"
    ? {
      bottom: `${window.innerHeight - rect.top + 12}px`,
      left: `${Math.min(Math.max(12, rect.left), window.innerWidth - 320)}px`,
    }
    : {
      top: `${rect.bottom + 12}px`,
      left: `${Math.min(Math.max(12, rect.left), window.innerWidth - 320)}px`,
    };

  return createPortal(
    <div className="fixed inset-0 z-[60]" data-testid="tour-spotlight" role="dialog" aria-modal="true">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/65 cursor-default border-0"
        aria-label="Fechar tutorial"
        onClick={() => onDismiss?.()}
      />
      <div
        className="pointer-events-none absolute rounded-lg ring-4 ring-blue-400 shadow-[0_0_0_9999px_rgba(15,23,42,0.65)]"
        style={{
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute rounded-lg outline outline-2 outline-offset-2 outline-white/80 animate-pulse"
        style={{
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        }}
        aria-hidden
      />

      <div
        className="absolute z-[61] w-[min(20rem,calc(100vw-1.5rem))] rounded-xl border border-slate-200 bg-white p-4 shadow-xl pointer-events-auto"
        style={cardStyle}
      >
        <p className="text-[10px] uppercase tracking-wide text-blue-700 font-semibold">
          {title} · passo {stepIndex + 1} de {total}
        </p>
        <h3 className="mt-1 text-base font-semibold text-slate-900 break-words">{stepTitle}</h3>
        <p className="mt-1.5 text-sm text-slate-600 leading-relaxed break-words">{stepBody}</p>
        <p className="mt-2 text-xs font-medium text-amber-800 bg-amber-50 border border-amber-100 rounded-md px-2 py-1.5">
          Toque ou clique no botão iluminado para seguir o processo.
        </p>
        <div className="mt-3 flex flex-col-reverse sm:flex-row gap-2 sm:justify-between sm:items-center">
          <Button asChild variant="link" className="h-auto p-0 text-xs text-slate-600">
            <Link to={HELP_PATH} onClick={() => onDismiss?.()}>Ver na Ajuda</Link>
          </Button>
          <div className="flex flex-col-reverse sm:flex-row gap-2 w-full sm:w-auto">
            {!isFirst && (
              <Button type="button" variant="outline" size="sm" className="w-full sm:w-auto" onClick={() => onStepChange?.(stepIndex - 1)}>
                Anterior
              </Button>
            )}
            {!isLast ? (
              <Button type="button" size="sm" className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white" onClick={() => onStepChange?.(stepIndex + 1)}>
                Seguinte
              </Button>
            ) : (
              <Button type="button" size="sm" className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white" onClick={() => onDismiss?.()}>
                Entendi
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
