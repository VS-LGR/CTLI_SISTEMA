import { parseCalibrationNumber, decimalPlacesFromResolution } from "./parseNumber";
import { resolveResolutionForNominal } from "./pointCalculations";

/**
 * PR-7.8 / RE-7.2B Certificado-RBC — arredondamento para exibição no certificado.
 * Cálculos internos mantêm precisão total; esta camada espelha a aba Certificado-RBC.
 */

const UE_DISPLAY_FACTOR = 4.4;

function roundToDecimals(value, decimals) {
  if (!Number.isFinite(value)) return null;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/** Equivalente Excel MROUND — arredonda ao múltiplo mais próximo de `multiple`. */
export function mround(value, multiple) {
  const v = parseCalibrationNumber(value);
  const m = parseCalibrationNumber(multiple);
  if (!v.valid || !m.valid || m.value <= 0) return null;
  if (v.value === 0) return 0;
  const steps = Math.round(v.value / m.value + Number.EPSILON);
  const result = steps * m.value;
  const decimals = Math.max(0, -Math.floor(Math.log10(m.value)));
  return roundToDecimals(result, decimals);
}

function resolveResolution(resolution) {
  const res = parseCalibrationNumber(resolution);
  return res.valid && res.value > 0 ? res.value : null;
}

/** V.R. exibido (Certificado-RBC O49): MROUND(V.R., d). */
export function roundReferenceForDisplay(reference, resolution, decimals = null) {
  const ref = parseCalibrationNumber(reference);
  const d = resolveResolution(resolution);
  if (!ref.valid) return null;
  if (d == null) {
    return decimals != null ? roundToDecimals(ref.value, decimals) : ref.value;
  }
  const rounded = mround(ref.value, d);
  return decimals != null ? roundToDecimals(rounded, decimals) : rounded;
}

/** Média exibida (Certificado-RBC R49): MROUND(média, d). */
export function roundAverageForDisplay(average, resolution, decimals = null) {
  const avg = parseCalibrationNumber(average);
  const d = resolveResolution(resolution);
  if (!avg.valid) return null;
  if (d == null) {
    return decimals != null ? roundToDecimals(avg.value, decimals) : avg.value;
  }
  const rounded = mround(avg.value, d);
  return decimals != null ? roundToDecimals(rounded, decimals) : rounded;
}

/**
 * Erro exibido (Certificado-RBC V49): MROUND(média,d) − MROUND(V.R.,d).
 */
export function roundIndicationErrorFromRoundedInputs(average, reference, resolution, decimals = null) {
  const avg = parseCalibrationNumber(average);
  const ref = parseCalibrationNumber(reference);
  const d = resolveResolution(resolution);
  if (!avg.valid || !ref.valid) return null;
  if (d == null) {
    const e = avg.value - ref.value;
    return decimals != null ? roundToDecimals(e, decimals) : e;
  }
  const e = mround(avg.value, d) - mround(ref.value, d);
  return decimals != null ? roundToDecimals(e, decimals) : e;
}

/**
 * Ue exibida (Certificado-RBC Y49):
 * MROUND(max(Ue, d) + (d/10)×4,4, d)
 */
export function roundExpandedUncertainty(ueCalc, resolution, decimals = null) {
  const ue = parseCalibrationNumber(ueCalc);
  const d = resolveResolution(resolution);
  if (!ue.valid) return null;
  if (d == null) {
    return decimals != null ? roundToDecimals(ue.value, decimals) : ue.value;
  }

  let base = ue.value;
  if (base < d) base = d;

  const adjusted = base + (d / 10) * UE_DISPLAY_FACTOR;
  const rounded = mround(adjusted, d);
  return decimals != null ? roundToDecimals(rounded, decimals) : rounded;
}

/**
 * @deprecated Prefer roundIndicationErrorFromRoundedInputs para alinhar com Certificado-RBC.
 * Mantido para compatibilidade — regra NIT-DICLA-021 sobre E bruto.
 */
export function roundIndicationError(error, resolution, decimals = null) {
  const err = parseCalibrationNumber(error);
  const d = resolveResolution(resolution);
  if (!err.valid) return null;
  if (d == null) {
    return decimals != null ? roundToDecimals(err.value, decimals) : err.value;
  }

  let display = err.value;
  const abs = Math.abs(display);
  if (abs <= d / 2) {
    display = 0;
  } else if (abs > d / 2) {
    display = Math.sign(display || 1) * d;
  }

  if (decimals != null && Number.isFinite(decimals)) {
    return roundToDecimals(display, decimals);
  }
  return display;
}

/** Certificado-RBC AA49: Veff > 99 ou ∞ → "∞". */
export function formatVeffForDisplay(veff) {
  if (veff == null || veff === "") return "--";
  if (veff === Infinity || veff === "Infinity") return "∞";
  const n = Number(veff);
  if (n === Infinity || !Number.isFinite(n)) return "∞";
  if (n > 99) return "∞";
  return String(Math.floor(n));
}

/**
 * Valores de exibição unificados (PDF + editor) por ponto.
 */
export function buildCertificatePointDisplay(point, balance, unit = "g") {
  const resolutionStr = point?.resolution != null && String(point.resolution).trim() !== ""
    ? String(point.resolution)
    : resolveResolutionForNominal(point?.nominal_value, balance, unit);

  let decimals = null;
  if (point?.display_decimals != null && Number.isFinite(Number(point.display_decimals))) {
    decimals = Number(point.display_decimals);
  } else {
    decimals = decimalPlacesFromResolution(resolutionStr);
  }

  return {
    resolution: resolutionStr,
    decimals,
    reference: roundReferenceForDisplay(point?.nominal_value, resolutionStr, decimals),
    average: roundAverageForDisplay(point?.average_reading, resolutionStr, decimals),
    indicationError: roundIndicationErrorFromRoundedInputs(
      point?.average_reading,
      point?.nominal_value,
      resolutionStr,
      decimals,
    ),
    expandedUncertainty: roundExpandedUncertainty(
      point?.expanded_uncertainty,
      resolutionStr,
      decimals,
    ),
    veff: formatVeffForDisplay(point?.degrees_of_freedom),
  };
}
