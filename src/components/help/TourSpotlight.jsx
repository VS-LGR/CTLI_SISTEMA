import React, { useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { HELP_PATH } from "@/lib/help/helpModules";

const PAD = 10;

function measure(el) {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width < 2 && r.height < 2) return null;
  return {
    top: Math.max(0, r.top - PAD),
    left: Math.max(0, r.left - PAD),
    width: Math.min(window.innerWidth, r.width + PAD * 2),
    height: r.height + PAD * 2,
    bottom: r.bottom + PAD,
    right: r.right + PAD,
  };
}

function findTourTarget(highlightId) {
  if (!highlightId) return null;
  const nodes = document.querySelectorAll(`[data-tour="${highlightId}"]`);
  for (const el of nodes) {
    const r = el.getBoundingClientRect();
    if (r.width >= 2 && r.height >= 2) return el;
  }
  return nodes[0] || null;
}

/**
 * Destaca um botão/área da página (data-tour) e mostra o cartão do passo.
 * No mobile o cartão fica fixo na base; o buraco no dim permite clicar no botão.
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
  waiting = false,
}) {
  const [rect, setRect] = useState(null);
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(max-width: 639px)").matches,
  );

  useLayoutEffect(() => {
    if (!open) {
      setRect(null);
      return undefined;
    }

    let targetEl = null;
    let ro = null;
    let scrolledOnce = false;
    const mq = window.matchMedia("(max-width: 639px)");
    const onMq = () => setIsMobile(mq.matches);
    mq.addEventListener?.("change", onMq);
    onMq();

    const rectEqual = (a, b) =>
      a === b
      || (a
        && b
        && a.top === b.top
        && a.left === b.left
        && a.width === b.width
        && a.height === b.height);

    const update = () => {
      targetEl = findTourTarget(highlightId);
      if (!targetEl) {
        setRect((prev) => (prev == null ? prev : null));
        return;
      }
      if (!targetEl.classList.contains("tour-spotlight-target")) {
        targetEl.classList.add("tour-spotlight-target");
      }
      if (!ro && typeof ResizeObserver !== "undefined") {
        ro = new ResizeObserver(update);
        ro.observe(targetEl);
      }
      const next = measure(targetEl);
      setRect((prev) => (rectEqual(prev, next) ? prev : next));
    };

    const scrollAndUpdate = () => {
      targetEl = findTourTarget(highlightId);
      if (targetEl && !scrolledOnce) {
        scrolledOnce = true;
        targetEl.scrollIntoView({ block: "center", behavior: "auto", inline: "nearest" });
      }
      update();
    };

    scrollAndUpdate();
    const t1 = window.setTimeout(update, 120);
    const t2 = window.setTimeout(update, 400);
    const t3 = window.setTimeout(update, 900);

    // Só childList: observar attributes reagia ao próprio overlay (loop de setState).
    const mo = typeof MutationObserver !== "undefined"
      ? new MutationObserver(() => update())
      : null;
    mo?.observe(document.body, { childList: true, subtree: true });

    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
      document.querySelectorAll(".tour-spotlight-target").forEach((el) => {
        el.classList.remove("tour-spotlight-target");
      });
      mo?.disconnect();
      ro?.disconnect();
      mq.removeEventListener?.("change", onMq);
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

  if (!open) return null;

  const hole = rect;
  const cardClass = isMobile
    ? "fixed left-3 right-3 bottom-3 z-[61] max-h-[min(50dvh,22rem)] overflow-y-auto overscroll-contain rounded-xl border border-slate-200 bg-white p-3 sm:p-4 shadow-xl pointer-events-auto"
    : "absolute z-[61] w-[min(20rem,calc(100vw-1.5rem))] max-h-[min(70vh,24rem)] overflow-y-auto overscroll-contain rounded-xl border border-slate-200 bg-white p-4 shadow-xl pointer-events-auto";

  const cardStyle = !isMobile && hole
    ? (() => {
      const spaceBelow = window.innerHeight - hole.bottom;
      const placeAbove = spaceBelow < 240 && hole.top > 240;
      return placeAbove
        ? {
          bottom: `${window.innerHeight - hole.top + 12}px`,
          left: `${Math.min(Math.max(12, hole.left), window.innerWidth - 320)}px`,
        }
        : {
          top: `${Math.min(hole.bottom + 12, window.innerHeight - 200)}px`,
          left: `${Math.min(Math.max(12, hole.left), window.innerWidth - 320)}px`,
        };
    })()
    : undefined;

  return createPortal(
    <div className="fixed inset-0 z-[60]" data-testid="tour-spotlight" role="dialog" aria-modal="true">
      {/* Dim com “buraco” clicável no alvo */}
      {hole ? (
        <>
          <button
            type="button"
            className="absolute inset-x-0 top-0 border-0 bg-slate-900/65 cursor-default p-0"
            style={{ height: Math.max(0, hole.top) }}
            aria-label="Fechar tutorial"
            onClick={() => onDismiss?.()}
          />
          <button
            type="button"
            className="absolute left-0 border-0 bg-slate-900/65 cursor-default p-0"
            style={{ top: hole.top, height: hole.height, width: Math.max(0, hole.left) }}
            aria-label="Fechar tutorial"
            onClick={() => onDismiss?.()}
          />
          <button
            type="button"
            className="absolute right-0 border-0 bg-slate-900/65 cursor-default p-0"
            style={{
              top: hole.top,
              height: hole.height,
              width: Math.max(0, window.innerWidth - hole.left - hole.width),
            }}
            aria-label="Fechar tutorial"
            onClick={() => onDismiss?.()}
          />
          <button
            type="button"
            className="absolute inset-x-0 bottom-0 border-0 bg-slate-900/65 cursor-default p-0"
            style={{ height: Math.max(0, window.innerHeight - hole.top - hole.height) }}
            aria-label="Fechar tutorial"
            onClick={() => onDismiss?.()}
          />
          <div
            className="pointer-events-none absolute rounded-lg ring-4 ring-blue-400"
            style={{ top: hole.top, left: hole.left, width: hole.width, height: hole.height }}
            aria-hidden
          />
          <div
            className="pointer-events-none absolute rounded-lg outline outline-2 outline-offset-2 outline-white/90"
            style={{ top: hole.top, left: hole.left, width: hole.width, height: hole.height }}
            aria-hidden
          />
        </>
      ) : (
        <button
          type="button"
          className="absolute inset-0 bg-slate-900/65 cursor-default border-0"
          aria-label="Fechar tutorial"
          onClick={() => onDismiss?.()}
        />
      )}

      <div className={cardClass} style={cardStyle}>
        <p className="text-[10px] uppercase tracking-wide text-blue-700 font-semibold">
          {title} · passo {stepIndex + 1} de {total}
        </p>
        <h3 className="mt-1 text-base font-semibold text-slate-900 break-words">{stepTitle}</h3>
        <p className="mt-1.5 text-sm text-slate-600 leading-relaxed break-words">{stepBody}</p>
        {waiting && !hole ? (
          <p className="mt-2 text-xs text-slate-500">A localizar o botão nesta página…</p>
        ) : (
          <p className="mt-2 text-xs font-medium text-amber-800 bg-amber-50 border border-amber-100 rounded-md px-2 py-1.5">
            Toque ou clique no botão iluminado para seguir o processo.
          </p>
        )}
        <div className="mt-3 flex flex-col-reverse sm:flex-row gap-2 sm:justify-between sm:items-center">
          <Button asChild variant="link" className="h-auto p-0 text-xs text-slate-600">
            <Link to={HELP_PATH} onClick={() => onDismiss?.()}>Ver na Ajuda</Link>
          </Button>
          <div className="flex flex-col-reverse sm:flex-row gap-2 w-full sm:w-auto">
            {!isFirst && (
              <Button type="button" variant="outline" size="sm" className="w-full sm:w-auto min-h-10" onClick={() => onStepChange?.(stepIndex - 1)}>
                Anterior
              </Button>
            )}
            {!isLast ? (
              <Button type="button" size="sm" className="w-full sm:w-auto min-h-10 bg-blue-600 hover:bg-blue-700 text-white" onClick={() => onStepChange?.(stepIndex + 1)}>
                Seguinte
              </Button>
            ) : (
              <Button type="button" size="sm" className="w-full sm:w-auto min-h-10 bg-blue-600 hover:bg-blue-700 text-white" onClick={() => onDismiss?.()}>
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
