export const DISPLAY_LABEL_EXPANSIONS = {
  "Termo-baro": "Termo-baro-higrômetro",
  TBH: "Termo-baro-higrômetro",
  "V.N.": "Valor nominal",
  "V.V.C.": "Valor convencional",
  Ue: "Incerteza expandida",
  "Peso padrão": "Peso padrão",
};

export function expandDisplayLabel(label) {
  if (!label) return "";
  const trimmed = String(label).trim();
  return DISPLAY_LABEL_EXPANSIONS[trimmed] || trimmed;
}

export function tooltipLabelForText(text, { expandAbbreviations = true } = {}) {
  if (!text) return "";
  const base = String(text).trim();
  if (!expandAbbreviations) return base;
  return expandDisplayLabel(base);
}
