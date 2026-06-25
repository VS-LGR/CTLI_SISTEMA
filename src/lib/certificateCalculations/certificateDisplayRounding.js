import { parseCalibrationNumber } from "./parseNumber";

/**
 * PR-7.8 — arredondamento para exibição no certificado.
 * Cálculos internos mantêm precisão total; esta camada só formata saída.
 */

function roundToDecimals(value, decimals) {
  if (!Number.isFinite(value)) return null;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function roundUpToDecimals(value, decimals) {
  if (!Number.isFinite(value)) return null;
  const factor = 10 ** decimals;
  return Math.ceil(value * factor - 1e-12) / factor;
}

/**
 * Ue exibida: mínimo = resolução d; se arredondamento reduzir >5%, arredondar para cima.
 */
export function roundExpandedUncertainty(ueCalc, resolution, decimals = null) {
  const ue = parseCalibrationNumber(ueCalc);
  const res = parseCalibrationNumber(resolution);
  if (!ue.valid) return null;
  if (!res.valid || res.value <= 0) {
    return decimals != null ? roundToDecimals(ue.value, decimals) : ue.value;
  }

  let display = ue.value;
  if (display < res.value) display = res.value;

  if (decimals != null && Number.isFinite(decimals)) {
    const rounded = roundToDecimals(display, decimals);
    if (rounded != null && ue.value > 0 && rounded < ue.value * 0.95) {
      return roundUpToDecimals(display, decimals);
    }
    return rounded;
  }
  return display;
}

/**
 * Erro de indicação: |E| ≤ d/2 → 0; |E| > d/2 → d (NIT-DICLA-021).
 */
export function roundIndicationError(error, resolution, decimals = null) {
  const err = parseCalibrationNumber(error);
  const res = parseCalibrationNumber(resolution);
  if (!err.valid) return null;
  if (!res.valid || res.value <= 0) {
    return decimals != null ? roundToDecimals(err.value, decimals) : err.value;
  }

  let display = err.value;
  const abs = Math.abs(display);
  if (abs <= res.value / 2) {
    display = 0;
  } else if (abs > res.value / 2) {
    display = Math.sign(display || 1) * res.value;
  }

  if (decimals != null && Number.isFinite(decimals)) {
    return roundToDecimals(display, decimals);
  }
  return display;
}

export function formatVeffForDisplay(veff) {
  if (veff == null) return "--";
  const n = Number(veff);
  if (!Number.isFinite(n) || n === Infinity) return "100";
  if (n >= 100) return "100";
  return String(Math.floor(n));
}
