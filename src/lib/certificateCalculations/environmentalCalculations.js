import { parseCalibrationNumber } from "./parseNumber";
import {
  correctConventionalMassForBuoyancy,
  shouldApplyVccCorrection,
} from "./conventionalMassCorrection";

function toGrams(value, unit) {
  if (!Number.isFinite(value)) return null;
  if (unit === "kg") return value * 1000;
  if (unit === "mg") return value / 1000;
  return value;
}

/** Soma VVC (valor convencional) dos pesos; opcional correção VCC (PR-7.2 §6.6). */
export function sumConventionalFromWeightIds(weightIds, weightItems = [], targetUnit = "g", options = {}) {
  const { airDensity = null, materialDensity = null, vccCorrection = true } = options;
  let sumG = 0;
  let valid = false;
  let vccCorrectionApplied = false;

  const applyVcc = vccCorrection && shouldApplyVccCorrection(airDensity) && materialDensity != null;
  const matD = parseCalibrationNumber(materialDensity);
  const du = matD.valid ? matD.value : null;

  for (const id of weightIds || []) {
    const item = weightItems.find((w) => w.id === id);
    if (!item) continue;
    const raw = item.conventional_value || item.nominal_value;
    const p = parseCalibrationNumber(raw);
    if (!p.valid) continue;
    let vcG = toGrams(p.value, item.unit || "g");
    if (applyVcc && du) {
      vcG = correctConventionalMassForBuoyancy(vcG, airDensity, du);
      vccCorrectionApplied = true;
    }
    sumG += vcG;
    valid = true;
  }
  if (!valid) return { value: null, valid: false, reason: "Pesos não encontrados", vcc_correction_applied: false };
  if (targetUnit === "kg") {
    return { value: sumG / 1000, valid: true, reason: "", vcc_correction_applied: vccCorrectionApplied };
  }
  return { value: sumG, valid: true, reason: "", vcc_correction_applied: vccCorrectionApplied };
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
  temperature: 0,
  humidity: 3,
  pressure: 2,
};

/**
 * Massa específica do ar (kg/m³) — fórmula planilha xlsm:
 * ((0,348444 × P) − (UR × ((0,00252 × T) − 0,020582))) / (273,15 + T)
 * T, UR, P = médias inicial/final; arredondamento 2 casas decimais.
 */
export function calculateAirDensity(tAvg, urAvg, pAvg) {
  if (!Number.isFinite(tAvg) || !Number.isFinite(urAvg) || !Number.isFinite(pAvg)) {
    return { value: null, valid: false, reason: "Dados ambientais incompletos" };
  }
  const denominator = 273.15 + tAvg;
  if (denominator === 0) return { value: null, valid: false, reason: "Temperatura inválida" };
  const numerator = (0.348444 * pAvg) - (urAvg * ((0.00252 * tAvg) - 0.020582));
  const raw = numerator / denominator;
  const value = Math.round(raw * 100) / 100;
  if (!Number.isFinite(value)) return { value: null, valid: false, reason: "Cálculo inválido" };
  return { value, valid: true, reason: "" };
}

export function calculateAirDensityFromEnvironmental(environmental = {}) {
  const tAvg = environmentalAverage(environmental.initial_temperature, environmental.final_temperature);
  const urAvg = environmentalAverage(environmental.initial_humidity, environmental.final_humidity);
  const pAvg = environmentalAverage(environmental.initial_pressure, environmental.final_pressure);
  return calculateAirDensity(tAvg, urAvg, pAvg);
}

/** Formata ρ_ar para exibição BR (ex.: 1,12). */
export function formatAirDensityDisplay(value) {
  if (value == null || value === "" || !Number.isFinite(Number(value))) return "—";
  return Number(value).toFixed(2).replace(".", ",");
}
