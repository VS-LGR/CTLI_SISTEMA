import React from "react";
import TourSpotlight from "@/components/help/TourSpotlight";
import { isTourNavHighlight, requestTourNavOpen } from "@/lib/help/tourNavBridge";

function isElementOnScreen(el) {
  if (!el || typeof window === "undefined") return false;
  if (el.closest('[aria-hidden="true"]')) return false;
  const style = window.getComputedStyle(el);
  if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") {
    return false;
  }
  const r = el.getBoundingClientRect();
  if (r.width < 2 || r.height < 2) return false;
  if (r.right < 8 || r.bottom < 8 || r.left > window.innerWidth - 8 || r.top > window.innerHeight - 8) {
    return false;
  }
  return true;
}

function useHighlightReady(highlightId, open, stepIndex) {
  const [ready, setReady] = React.useState(false);
  const [waiting, setWaiting] = React.useState(false);

  React.useLayoutEffect(() => {
    if (!open || !highlightId) {
      setReady(false);
      setWaiting(false);
      return undefined;
    }

    setWaiting(true);
    setReady(false);
    let cancelled = false;

    if (isTourNavHighlight(highlightId)) {
      requestTourNavOpen();
    }

    const check = () => {
      if (cancelled) return false;
      const nodes = document.querySelectorAll(`[data-tour="${highlightId}"]`);
      for (const el of nodes) {
        if (isElementOnScreen(el)) {
          setReady((prev) => (prev ? prev : true));
          setWaiting(false);
          return true;
        }
      }
      return false;
    };

    if (check()) return undefined;

    const delays = [100, 250, 500, 900, 1500, 2500];
    const timers = delays.map((ms) => window.setTimeout(check, ms));
    // Reabrir menu em retries (sheet/sidebar animam)
    const navTimers = isTourNavHighlight(highlightId)
      ? [80, 300, 700].map((ms) => window.setTimeout(() => requestTourNavOpen(), ms))
      : [];

    const mo = typeof MutationObserver !== "undefined"
      ? new MutationObserver(() => { check(); })
      : null;
    mo?.observe(document.body, { childList: true, subtree: true });

    const giveUp = window.setTimeout(() => {
      if (!cancelled) setWaiting(false);
    }, 3000);

    return () => {
      cancelled = true;
      timers.forEach((t) => window.clearTimeout(t));
      navTimers.forEach((t) => window.clearTimeout(t));
      window.clearTimeout(giveUp);
      mo?.disconnect();
    };
  }, [open, highlightId, stepIndex]);

  return { ready, waiting };
}

/**
 * Overlay de tutorial — sempre tenta spotlight no botão real (data-tour).
 */
export default function ModuleTourOverlay({
  open,
  module,
  stepIndex,
  onStepChange,
  onDismiss,
}) {
  const steps = module?.steps || [];
  const total = steps.length;
  const step = steps[stepIndex] || steps[0];
  const isLast = stepIndex >= total - 1;
  const isFirst = stepIndex <= 0;
  const highlightId = step?.highlight || "tour-nav-help";
  const { waiting } = useHighlightReady(highlightId, open && Boolean(module), stepIndex);

  if (!module || !open) return null;

  return (
    <TourSpotlight
      open={open}
      highlightId={highlightId}
      title={module.title}
      stepTitle={step?.title || module.title}
      stepBody={step?.body || ""}
      stepIndex={stepIndex}
      total={Math.max(total, 1)}
      isFirst={isFirst}
      isLast={isLast}
      onStepChange={onStepChange}
      onDismiss={onDismiss}
      waiting={waiting}
    />
  );
}
