import { parseCalibrationNumber } from "./parseNumber";

function toGrams(value, unit) {
  if (!Number.isFinite(value)) return null;
  if (unit === "kg") return value * 1000;
  if (unit === "mg") return value / 1000;
  return value;
}

/** Soma VVC (valor convencional) dos pesos em gramas, retorna na unidade da balança. */
export function sumConventionalFromWeightIds(weightIds, weightItems = [], targetUnit = "g") {
  let sumG = 0;
  let valid = false;
  for (const id of weightIds || []) {
    const item = weightItems.find((w) => w.id === id);
    if (!item) continue;
    const raw = item.conventional_value || item.nominal_value;
    const p = parseCalibrationNumber(raw);
    if (!p.valid) continue;
    sumG += toGrams(p.value, item.unit || "g");
    valid = true;
  }
  if (!valid) return { value: null, valid: false, reason: "Pesos não encontrados" };
  if (targetUnit === "kg") return { value: sumG / 1000, valid: true, reason: "" };
  return { value: sumG, valid: true, reason: "" };
}

/** Incerteza expandida combinada dos pesos (RSS) em gramas → unidade alvo. */
export function combinedExpandedUncertaintyFromWeightIds(weightIds, weightItems = [], targetUnit = "g") {
  let sumSq = 0;
  let valid = false;
  for (const id of weightIds || []) {
    const item = weightItems.find((w) => w.id === id);
    if (!item) continue;
    const p = parseCalibrationNumber(item.expanded_uncertainty);
    if (!p.valid) continue;
    const ueG = toGrams(p.value, item.unit || "g");
    sumSq += ueG * ueG;
    valid = true;
  }
  if (!valid) return { value: null, valid: false, reason: "" };
  const combinedG = Math.sqrt(sumSq);
  if (targetUnit === "kg") return { value: combinedG / 1000, valid: true, reason: "" };
  return { value: combinedG, valid: true, reason: "" };
}

export function environmentalAverage(initial, final) {
  const a = parseCalibrationNumber(initial);
  const b = parseCalibrationNumber(final);
  if (a.valid && b.valid) return (a.value + b.value) / 2;
  return a.valid ? a.value : b.valid ? b.value : null;
}

/** Incerteza ambiental conforme planilha PREENCHER: |ini-fin|/2 + constante. */
export function environmentalUncertainty(initial, final, constant = 0) {
  const a = parseCalibrationNumber(initial);
  const b = parseCalibrationNumber(final);
  if (!a.valid || !b.valid) return null;
  return Math.abs(a.value - b.value) / 2 + constant;
}

export const ENV_UNCERTAINTY_CONSTANTS = {
  temperature: 0.5,
  humidity: 3,
  pressure: 2,
};
