import { parseCalibrationNumber } from "./parseNumber";
import { driftFromWeightItem } from "@/lib/standardWeightCalculations";

const SQRT3 = Math.sqrt(3);
const DEFAULT_STANDARD_K = 2;
const T_INV_PROB = 0.97725;

function stdevSample(values) {
  const n = values.length;
  if (n < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const sumSq = values.reduce((s, v) => s + (v - mean) ** 2, 0);
  return Math.sqrt(sumSq / (n - 1));
}

function toGrams(value, unit) {
  if (!Number.isFinite(value)) return null;
  if (unit === "kg") return value * 1000;
  if (unit === "mg") return value / 1000;
  return value;
}

function inverseNormalCdf(p) {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  if (p === 0.5) return 0;

  const a = [
    -3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2,
    1.383577518672690e2, -3.066479861614132e1, 2.506628277459239e0,
  ];
  const b = [
    -5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2,
    6.680131188771972e1, -1.328068155288572e1,
  ];
  const c = [
    -7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838e0,
    -2.549732539343734e0, 4.374664141464968e0, 2.938163982698783e0,
  ];
  const d = [
    7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996e0,
    3.754408661907416e0,
  ];

  const split = 0.425;
  const q = p - 0.5;

  if (Math.abs(q) <= split) {
    const r = 0.180625 - q * q;
    return q * (((((a[5] * r + a[4]) * r + a[3]) * r + a[2]) * r + a[1]) * r + a[0])
      / (((((b[4] * r + b[3]) * r + b[2]) * r + b[1]) * r + b[0]) * r + 1);
  }

  const r = q > 0 ? 1 - p : p;
  const rt = Math.sqrt(-Math.log(r));
  const poly = rt <= 5
    ? (((((c[5] * rt + c[4]) * rt + c[3]) * rt + c[2]) * rt + c[1]) * rt + c[0])
      / ((((d[3] * rt + d[2]) * rt + d[1]) * rt + d[0]) * rt + 1)
    : (((((c[5] * rt + c[4]) * rt + c[3]) * rt + c[2]) * rt + c[1]) * rt + c[0])
      / ((((d[3] * rt + d[2]) * rt + d[1]) * rt + d[0]) * rt + 1);

  return q > 0 ? poly : -poly;
}

function studentTInv(probability, nu) {
  if (!Number.isFinite(nu) || nu <= 0) return 2;
  const z = inverseNormalCdf(probability);
  const z2 = z * z;
  const z3 = z2 * z;
  const z5 = z3 * z2;
  const z7 = z5 * z2;
  const z9 = z7 * z2;

  const g1 = (z3 + z) / (4 * nu);
  const g2 = (5 * z5 + 16 * z3 + 3 * z) / (96 * nu * nu);
  const g3 = (3 * z7 + 19 * z5 + 17 * z3 - 15 * z) / (384 * nu * nu * nu);
  const g4 = (79 * z9 + 776 * z7 + 1482 * z5 - 1920 * z3 - 945 * z) / (92160 * nu ** 4);

  return z + g1 + g2 + g3 + g4;
}

/** t_{0,97725; ν} — 95,45% (PR-7.6 / planilha RE-7.2B). Fonte: distribuição t de Student. */
const T_INVERSE_9545 = [
  0, 12.706, 4.303, 3.182, 2.776, 2.571, 2.517, 2.447, 2.397, 2.357, 2.325,
  2.298, 2.276, 2.256, 2.24, 2.224, 2.212, 2.2, 2.189, 2.179, 2.17,
  2.162, 2.154, 2.147, 2.14, 2.134, 2.128, 2.123, 2.118, 2.113, 2.108,
  2.104, 2.1, 2.096, 2.092, 2.088, 2.085, 2.082, 2.079, 2.076, 2.073,
  2.07, 2.068, 2.066, 2.064, 2.062, 2.06, 2.058, 2.056, 2.054, 2.052,
  2.05, 2.048, 2.047, 2.045, 2.044, 2.042, 2.041, 2.04, 2.038, 2.037,
  2.036, 2.035, 2.034, 2.033, 2.032, 2.031, 2.03, 2.029, 2.028, 2.027,
  2.026, 2.025, 2.024, 2.023, 2.022, 2.022, 2.021, 2.02, 2.019, 2.019,
  2.018, 2.017, 2.017, 2.016, 2.015, 2.015, 2.014, 2.014, 2.013, 2.013,
  2.012, 2.012, 2.011, 2.011, 2.01, 2.01, 2.009, 2.009, 2.008, 2.008,
];

export function coverageFactorFromNu(nu) {
  if (!Number.isFinite(nu) || nu <= 0 || nu === Infinity) return 2;
  if (nu >= 100) return 2;
  const df = Math.floor(nu);
  if (df >= 1 && df < T_INVERSE_9545.length) {
    return Math.min(T_INVERSE_9545[df], 3);
  }
  const t = studentTInv(T_INV_PROB, nu);
  return Math.max(2, Math.min(t, 3));
}

/** PR-7.6 §5.3.6 — apenas ua (Tipo A) entra no Welch-Satterthwaite. */
export function welchSatterthwaiteNuEff(components) {
  const uaEntry = (components || []).find(
    (c) => c && c.type === "ua" && Number.isFinite(c.u) && c.u > 0 && Number.isFinite(c.nu) && c.nu > 0,
  );
  if (!uaEntry) return Infinity;

  const all = (components || []).filter((c) => c && Number.isFinite(c.u));
  const ucSq = all.reduce((s, c) => s + c.u * c.u, 0);
  const uc = Math.sqrt(ucSq);
  if (uc === 0) return Infinity;

  const denom = (uaEntry.u ** 4) / uaEntry.nu;
  if (denom <= 0) return Infinity;

  const nuEff = (uc ** 4) / denom;
  return Number.isFinite(nuEff) && nuEff > 0 ? nuEff : Infinity;
}

export function truncateVeff(nu) {
  if (!Number.isFinite(nu) || nu === Infinity) return Infinity;
  return Math.floor(nu);
}

export function resolveReadingsAfter(point) {
  if (Array.isArray(point?.readings_after) && point.readings_after.length) {
    return point.readings_after;
  }
  return [point?.reading1, point?.reading2, point?.reading3].filter(
    (r) => r != null && String(r).trim() !== "",
  );
}

export function resolveReadingsBefore(point) {
  if (Array.isArray(point?.readings_before) && point.readings_before.length) {
    return point.readings_before;
  }
  if (point?.reading_before_adjustment != null && String(point.reading_before_adjustment).trim() !== "") {
    return [point.reading_before_adjustment];
  }
  return [];
}

/** up = √Σ(Ueᵢ/kᵢ)² — sem /√3 adicional (PR-7.6). */
export function standardUncertaintyUpFromWeightIds(weightIds, weightItems = [], targetUnit = "g", kDefault = DEFAULT_STANDARD_K) {
  let sumSq = 0;
  let valid = false;

  for (const id of weightIds || []) {
    const item = weightItems.find((w) => w.id === id);
    if (!item) continue;
    const ue = parseCalibrationNumber(item.expanded_uncertainty);
    if (!ue.valid) continue;
    const kParsed = parseCalibrationNumber(item.coverage_factor);
    const k = kParsed.valid && kParsed.value > 0 ? kParsed.value : kDefault;
    const ueG = toGrams(ue.value, item.unit || "g");
    if (ueG == null) continue;
    const uUe = ueG / k;
    sumSq += uUe * uUe;
    valid = true;
  }

  if (!valid) return { value: null, valid: false, reason: "" };
  const combinedG = Math.sqrt(sumSq);
  if (targetUnit === "kg") return { value: combinedG / 1000, valid: true, reason: "" };
  return { value: combinedG, valid: true, reason: "" };
}

/** ud = √Σ(|derivaᵢ|/√3)² (PR-7.6). */
export function driftUncertaintyUdFromWeightIds(weightIds, weightItems = [], targetUnit = "g") {
  let sumSq = 0;
  let valid = false;
  const driftErrors = [];

  for (const id of weightIds || []) {
    const item = weightItems.find((w) => w.id === id);
    if (!item) continue;

    const drift = driftFromWeightItem(item);
    if (!drift.valid) {
      if (item.weight_status === "2") {
        driftErrors.push(`${item.identification}: ${drift.reason || "deriva inválida"}`);
      }
      continue;
    }

    const driftG = toGrams(Math.abs(drift.value), item.unit || "g");
    if (driftG == null) continue;
    const uDrift = driftG / SQRT3;
    sumSq += uDrift * uDrift;
    valid = true;
  }

  if (driftErrors.length) {
    return { value: null, valid: false, reason: driftErrors.join("; "), driftErrors };
  }
  if (!valid) return { value: 0, valid: true, reason: "" };
  const combinedG = Math.sqrt(sumSq);
  if (targetUnit === "kg") return { value: combinedG / 1000, valid: true, reason: "" };
  return { value: combinedG, valid: true, reason: "" };
}

/** @deprecated Use standardUncertaintyUpFromWeightIds + driftUncertaintyUdFromWeightIds */
export function standardUncertaintyAbsFromWeightIds(weightIds, weightItems = [], targetUnit = "g", kDefault = DEFAULT_STANDARD_K) {
  return standardUncertaintyUpFromWeightIds(weightIds, weightItems, targetUnit, kDefault);
}

export function resolveResolutionForNominal(nominalValue, balance = {}, unit = "g") {
  const fallback = balance.resolucao || balance.resolution_1 || "";
  const nom = parseCalibrationNumber(nominalValue);
  if (!nom.valid) return fallback;

  const ranges = [
    { cap: balance.capacidade || balance.capacity_1, res: balance.resolucao || balance.resolution_1 },
    { cap: balance.capacidade_2 || balance.capacity_2, res: balance.resolucao_2 || balance.resolution_2 },
    { cap: balance.capacidade_3 || balance.capacity_3, res: balance.resolucao_3 || balance.resolution_3 },
  ];

  let nomVal = nom.value;
  if (unit === "kg") nomVal *= 1000;

  for (const range of ranges) {
    const cap = parseCalibrationNumber(range.cap);
    if (!cap.valid || !range.res) continue;
    let capVal = cap.value;
    if (unit === "kg") capVal *= 1000;
    if (nomVal <= capVal) return range.res;
  }

  const lastRes = ranges.map((r) => r.res).filter(Boolean).pop();
  return lastRes || fallback;
}

export function calculatePointAverage(readings) {
  const nums = readings
    .map((r) => parseCalibrationNumber(r))
    .filter((p) => p.valid)
    .map((p) => p.value);
  if (!nums.length) return { value: null, valid: false, reason: "Sem leituras válidas" };
  const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
  return { value: avg, valid: true, reason: "", count: nums.length };
}

export function calculateIndicationError(averageReading, referenceValue, errorMultiplier = 1) {
  const avg = parseCalibrationNumber(averageReading);
  const ref = parseCalibrationNumber(referenceValue);
  if (!avg.valid || !ref.valid) return { value: null, valid: false, reason: "Média ou referência ausente" };
  const m = parseCalibrationNumber(errorMultiplier);
  const mult = m.valid && m.value > 0 ? m.value : 1;
  return { value: avg.value - ref.value * mult, valid: true, reason: "" };
}

/** ua — repetitividade (Tipo A): STDEV / √n */
export function calculateRepeatability(readings) {
  const nums = readings
    .map((r) => parseCalibrationNumber(r))
    .filter((p) => p.valid)
    .map((p) => p.value);
  if (nums.length < 2) return { value: 0, valid: true, reason: "", n: nums.length };
  const sd = stdevSample(nums);
  const u = sd / Math.sqrt(nums.length);
  return { value: u, valid: true, reason: "", n: nums.length };
}

/** ur = d / (2×√3) — distribuição retangular (PR-7.6). */
export function calculateResolutionContribution(resolution) {
  const r = parseCalibrationNumber(resolution);
  if (!r.valid) return { value: null, valid: false, reason: "Resolução inválida" };
  const contrib = r.value / (2 * SQRT3);
  return { value: contrib, valid: true, reason: "", halfResolution: r.value / 2 };
}

export function calculateExpandedUncertainty(components) {
  const valid = components.filter((c) => c != null && Number.isFinite(c));
  if (!valid.length) return { combined: null, expanded: null, k: null, nu: null, valid: false, reason: "Sem componentes" };
  const combined = Math.sqrt(valid.reduce((s, c) => s + c * c, 0));
  return { combined, valid: true, reason: "" };
}

export function calculateEccentricityError(reading, reference) {
  const r = parseCalibrationNumber(reading);
  const ref = parseCalibrationNumber(reference);
  if (!r.valid || !ref.valid) return { value: null, valid: false, reason: "Leitura ou referência ausente" };
  return { value: r.value - ref.value, valid: true, reason: "" };
}

export function calculateCalibrationPoint(point, {
  resolution,
  unit = "g",
  referenceValue = null,
  up = 0,
  ud = 0,
  ue = 0,
  upLC = 0,
  errorMultiplier = 1,
  errorBeforeAdjustment = null,
} = {}) {
  const readings = resolveReadingsAfter(point);
  if (!readings.length && !point.nominal_value && referenceValue == null) {
    return { calcStatus: "pendente", calcError: "", results: {} };
  }

  if (readings.length > 0 && readings.length < 3) {
    return { calcStatus: "erro", calcError: "Mínimo de 3 leituras depois do ajuste", results: {} };
  }

  const avgRes = calculatePointAverage(readings);
  if (!avgRes.valid) {
    return { calcStatus: "erro", calcError: avgRes.reason, results: {} };
  }

  const refVal = referenceValue != null ? referenceValue : point.nominal_value;
  const ref = parseCalibrationNumber(refVal);
  if (!ref.valid) {
    return { calcStatus: "erro", calcError: "Valor de referência (V.R.) obrigatório", results: {} };
  }

  const indication = calculateIndicationError(avgRes.value, ref.value, errorMultiplier);
  const repeatability = calculateRepeatability(readings);
  const resolutionContrib = calculateResolutionContribution(resolution);

  let errorBefore = null;
  if (errorBeforeAdjustment != null) {
    const eb = parseCalibrationNumber(errorBeforeAdjustment);
    if (eb.valid) errorBefore = eb.value;
  } else {
    const beforeReadings = resolveReadingsBefore(point);
    if (beforeReadings.length >= 2) {
      const beforeAvg = calculatePointAverage(beforeReadings);
      if (beforeAvg.valid) errorBefore = beforeAvg.value - ref.value;
    } else if (beforeReadings.length === 1) {
      const before = parseCalibrationNumber(beforeReadings[0]);
      if (before.valid) errorBefore = before.value - ref.value;
    } else if (point.reading_before_adjustment != null && String(point.reading_before_adjustment).trim() !== "") {
      const before = parseCalibrationNumber(point.reading_before_adjustment);
      if (before.valid) errorBefore = before.value - ref.value;
    }
  }

  const ua = repeatability.valid ? repeatability.value : 0;
  const ur = resolutionContrib.valid ? resolutionContrib.value : 0;
  const upVal = Number.isFinite(up) ? up : 0;
  const udVal = Number.isFinite(ud) ? ud : 0;
  const ueVal = Number.isFinite(ue) ? ue : 0;
  const upLcVal = Number.isFinite(upLC) ? upLC : 0;

  const components = [ua, upVal, udVal, ueVal, ur, upLcVal].filter((c) => Number.isFinite(c));
  const combinedRes = calculateExpandedUncertainty(components);

  const nReadings = repeatability.n || readings.length;
  const nuRep = nReadings >= 2 ? nReadings - 1 : 0;
  const nuRaw = welchSatterthwaiteNuEff([
    { type: "ua", u: ua, nu: nuRep },
    { type: "up", u: upVal, nu: Infinity },
    { type: "ud", u: udVal, nu: Infinity },
    { type: "ue", u: ueVal, nu: Infinity },
    { type: "ur", u: ur, nu: Infinity },
    { type: "upLC", u: upLcVal, nu: Infinity },
  ]);
  const nu = truncateVeff(nuRaw);

  const k = coverageFactorFromNu(nu);
  const expanded = combinedRes.valid ? k * combinedRes.combined : null;

  const memory = {
    average: avgRes.value,
    referenceValue: ref.value,
    indicationError: indication.value,
    errorBeforeAdjustment: errorBefore,
    ua,
    up: upVal,
    ud: udVal,
    ue: ueVal,
    ur,
    repeatability: ua,
    resolutionContribution: ur,
    standardContribution: upVal,
    driftContribution: udVal,
    buoyancyContribution: ueVal,
    upLC: upLcVal,
    errorMultiplier: parseCalibrationNumber(errorMultiplier).valid
      ? parseCalibrationNumber(errorMultiplier).value
      : 1,
    combinedUncertainty: combinedRes.combined,
    coverageFactor: k,
    degreesOfFreedom: nu,
    expandedUncertainty: expanded,
    readingCount: avgRes.count,
  };

  return {
    calcStatus: "calculado",
    calcError: "",
    results: {
      average_reading: avgRes.value,
      indication_error: indication.value,
      error_before_adjustment: errorBefore,
      repeatability: ua,
      resolution: resolutionContrib.halfResolution,
      standard_uncertainty: combinedRes.combined,
      expanded_uncertainty: expanded,
      coverage_factor: k,
      degrees_of_freedom: nu,
      calculation_memory: memory,
    },
  };
}

export function sumNominalFromWeightIds(weightIds, weightItems = []) {
  let sum = 0;
  let valid = false;
  for (const id of weightIds || []) {
    const item = weightItems.find((w) => w.id === id);
    if (!item) continue;
    const p = parseCalibrationNumber(item.nominal_value);
    if (p.valid) {
      sum += p.value;
      valid = true;
    }
  }
  return { value: valid ? sum : null, valid, reason: valid ? "" : "Pesos não encontrados" };
}

export function maxStandardUncertaintyPpm(weightIds, weightItems = [], weightCerts = []) {
  let maxPpm = 0;
  for (const id of weightIds || []) {
    const item = weightItems.find((w) => w.id === id);
    if (!item) continue;
    const cert = weightCerts.find((c) => c.id === item.weight_certificate_id);
    const unc = cert?.uncertainty_ppm ?? cert?.snapshot?.uncertainty_ppm ?? item.uncertainty_ppm;
    const p = parseCalibrationNumber(unc);
    if (p.valid && p.value > maxPpm) maxPpm = p.value;
  }
  return maxPpm || 2;
}

/** @deprecated */
export function calculateStandardUncertaintyContribution(nominalKg, standardUncertaintyPpm, standardUncertaintyAbs = null) {
  if (standardUncertaintyAbs != null && Number.isFinite(standardUncertaintyAbs)) {
    return { value: standardUncertaintyAbs, valid: true, reason: "", absolute: standardUncertaintyAbs };
  }
  const nom = parseCalibrationNumber(nominalKg);
  const unc = parseCalibrationNumber(standardUncertaintyPpm);
  if (!nom.valid) return { value: null, valid: false, reason: "Valor nominal ausente" };
  const ppm = unc.valid ? unc.value : 0;
  const contrib = (nom.value / 1e6) * ppm;
  return { value: contrib, valid: true, reason: "", ppm };
}
