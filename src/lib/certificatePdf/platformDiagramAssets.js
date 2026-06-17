/** Imagem composta com os 3 tipos de plataforma (public/Balanças.png). */
export const PLATFORM_DIAGRAM_SOURCE = `${process.env.PUBLIC_URL || ""}/Balanças.png`;

/**
 * Painéis verticais na imagem composta.
 * yStart/yEnd são frações da altura total (0–1).
 */
export const PLATFORM_DIAGRAM_PANELS = [
  {
    id: "retangular_quadrada",
    label: "Retangular ou Quadrada",
    platformValues: ["retangular_quadrada"],
    yStart: 0,
    yEnd: 0.34,
  },
  {
    id: "redondo",
    label: "Redonda",
    platformValues: ["redondo"],
    yStart: 0.34,
    yEnd: 0.67,
  },
  {
    id: "rodoviaria",
    label: "Rodoviária",
    /** ferroviaria usa o mesmo painel visual (layout horizontal). */
    platformValues: ["rodoviaria", "ferroviaria"],
    yStart: 0.67,
    yEnd: 1,
    ferroviariaLabel: "Rodoviária / Ferroviária",
  },
];

/**
 * @param {string} tipoPlataforma
 * @returns {string|null} id do painel ativo ou null
 */
export function resolveActivePlatformPanel(tipoPlataforma) {
  const v = String(tipoPlataforma || "").trim();
  if (!v || v === "excentricidade_na") return null;
  const panel = PLATFORM_DIAGRAM_PANELS.find((p) => p.platformValues.includes(v));
  return panel?.id || null;
}

/** Legenda exibida no PDF para um painel dado o tipo selecionado. */
export function platformPanelDisplayLabel(panel, tipoPlataforma) {
  if (panel.id === "rodoviaria" && tipoPlataforma === "ferroviaria" && panel.ferroviariaLabel) {
    return panel.ferroviariaLabel;
  }
  return panel.label;
}
