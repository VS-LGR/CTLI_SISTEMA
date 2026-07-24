/** Evento para o Layout abrir o menu (sidebar / sheet) durante o tutorial. */
export const TOUR_ENSURE_NAV_EVENT = "pv-tour-ensure-nav";

export function requestTourNavOpen() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(TOUR_ENSURE_NAV_EVENT));
}

export function isTourNavHighlight(highlightId) {
  return highlightId === "tour-nav-help";
}
