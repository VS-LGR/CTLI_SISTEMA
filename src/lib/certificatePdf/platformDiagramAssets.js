const PUBLIC = process.env.PUBLIC_URL || "";

function publicAsset(filename) {
  return `${PUBLIC}/${encodeURIComponent(filename)}`;
}

/** Diagramas individuais por tipo de plataforma (public/). */
export const PLATFORM_DIAGRAM_PANELS = [
  {
    id: "retangular_quadrada",
    label: "Retangular ou Quadrada",
    platformValues: ["retangular_quadrada"],
    src: publicAsset("Quadrada ou retangularBalanças.webp"),
  },
  {
    id: "redondo",
    label: "Redonda",
    platformValues: ["redondo"],
    src: publicAsset("RedondaBalanças.webp"),
  },
  {
    id: "rodoviaria",
    label: "Rodoviária",
    /** ferroviaria usa o mesmo painel visual (layout horizontal). */
    platformValues: ["rodoviaria", "ferroviaria"],
    src: publicAsset("RodoviariaBalanças.webp"),
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
