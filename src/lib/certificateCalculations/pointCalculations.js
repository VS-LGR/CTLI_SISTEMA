import { parseCalibrationNumber } from "./parseNumber";

const SQRT3 = Math.sqrt(3);
const DEFAULT_STANDARD_K = 2;
const T_INV_PROB = 0.97725; // two-sided 95.45 %

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

function toKg(value, unit) {
  if (unit === "kg") return value;
  if (unit === "g") return value / 1000;
  if (unit === "mg") return value / 1e6;
  return value;
}

/** Inverse standard normal CDF (Beasley–Springer–Moro). */
function normalInv(p) {
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
  let q = p - 0.5;
  let r;

  if (Math.abs(q) <= split) {
    r = 0.180625 - q * q;
    return q * (((((a[5] * r + a[4]) * r + a[3]) * r + a[2]) * r + a[1]) * r + a[0])
      / (((((b[4] * r + b[3]) * r + b[2]) * r + b[1]) * r + b[0]) * r + 1);
  }

  r = q > 0 ? 1 - p : p;
  r = Math.sqrt(-Math.log(r));
  const poly = r <= 5
    ? (((((c[5] * r + c[4]) * r + c[3]) * r + c[2]) * r + c[1]) * r + c[0])
      / ((((d[3] * r + d[2]) * r + d[1]) * r + d[0]) * r + 1)
    : (((((c[5] * r + c[4]) * r + c[3]) * r + c[2]) * r + c[1]) * r + c[0])
      / ((((d[3] * r + d[2]) * r + d[1]) * r + d[0]) * r + 1);

  return q > 0 ? poly : -poly;
}

/** Student t quantile — approximates Excel T.INV(probability, nu). */
function studentTInv(probability, nu) {
  if (!Number.isFinite(nu) || nu <= 0) return 2;
  const z = normalInv(probability);
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

export function coverageFactorFromNu(nu) {
  if (!Number.isFinite(nu) || nu <= 0) return 2;
  if (nu >= 100) return 2;
  const t = studentTInv(T_INV_PROB, nu);
  return Math.max(2, Math.min(t, 3));
}

export function welchSatterthwaiteNuEff(components) {
  const valid = (components || []).filter(
    (c) => c && Number.isFinite(c.u) && c.u > 0 && Number.isFinite(c.nu) && c.nu > 0,
  );
  if (!valid.length) return 100;

  const ucSq = valid.reduce((s, c) => s + c.u * c.u, 0);
  const uc = Math.sqrt(ucSq);
  if (uc === 0) return 100;

  const denom = valid.reduce((s, c) => s + (c.u ** 4) / c.nu, 0);
  if (denom <= 0) return 100;

  const nuEff = (uc ** 4) / denom;
  return Number.isFinite(nuEff) && nuEff > 0 ? nuEff : 100;
}

function halfResolution(resolution, unit) {
  const r = parseCalibrationNumber(resolution);
  if (!r.valid) return { value: null, valid: false, reason: "Resolução inválida" };
  const half = r.value / 2;
  return { value: unit === "g" ? half : half, valid: true, reason: "" };
}

/** RSS of (Ue/k) per weight in target unit — input to u_pad before /√3. */
export function standardUncertaintyAbsFromWeightIds(weightIds, weightItems = [], targetUnit = "g", kDefault = DEFAULT_STANDARD_K) {
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
    const uStd = ueG / k;
    sumSq += uStd * uStd;
    valid = true;
  }
  if (!valid) return { value: null, valid: false, reason: "" };
  const combinedG = Math.sqrt(sumSq);
  if (targetUnit === "kg") return { value: combinedG / 1000, valid: true, reason: "" };
  return { value: combinedG, valid: true, reason: "" };
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

export function calculateIndicationError(averageReading, nominalValue) {
  const avg = parseCalibrationNumber(averageReading);
  const nom = parseCalibrationNumber(nominalValue);
  if (!avg.valid || !nom.valid) return { value: null, valid: false, reason: "Média ou nominal ausente" };
  return { value: avg.value - nom.value, valid: true, reason: "" };
}

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

export function calculateResolutionContribution(resolution, unit = "g") {
  const half = halfResolution(resolution, unit);
  if (!half.valid) return { value: null, valid: false, reason: half.reason };
  const contrib = (half.value * 2) / SQRT3;
  return { value: contrib, valid: true, reason: "", halfResolution: half.value };
}

export function calculateStandardUncertaintyContribution(nominalKg, standardUncertaintyPpm, standardUncertaintyAbs = null) {
  if (standardUncertaintyAbs != null && Number.isFinite(standardUncertaintyAbs)) {
    const contrib = standardUncertaintyAbs / SQRT3;
    return { value: contrib, valid: true, reason: "", absolute: standardUncertaintyAbs };
  }
  const nom = parseCalibrationNumber(nominalKg);
  const unc = parseCalibrationNumber(standardUncertaintyPpm);
  if (!nom.valid) return { value: null, valid: false, reason: "Valor nominal ausente" };
  const ppm = unc.valid ? unc.value : 0;
  const contrib = ((nom.value / 1e6) * ppm) / SQRT3;
  return { value: contrib, valid: true, reason: "", ppm };
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
  standardUncertaintyPpm = 0,
  standardUncertaintyAbs = null,
  errorBeforeAdjustment = null,
} = {}) {
  const readings = [point.reading1, point.reading2, point.reading3].filter((r) => r != null && String(r).trim() !== "");
  if (!readings.length && !point.nominal_value) {
    return { calcStatus: "pendente", calcError: "", results: {} };
  }

  const avgRes = calculatePointAverage(readings);
  if (!avgRes.valid) {
    return { calcStatus: "erro", calcError: avgRes.reason, results: {} };
  }

  const nom = parseCalibrationNumber(point.nominal_value);
  if (!nom.valid) {
    return { calcStatus: "erro", calcError: "Valor nominal obrigatório", results: {} };
  }

  const indication = calculateIndicationError(avgRes.value, nom.value);
  const repeatability = calculateRepeatability(readings);
  const resolutionContrib = calculateResolutionContribution(resolution, unit);
  const nomKg = toKg(nom.value, unit);
  const standardContrib = calculateStandardUncertaintyContribution(nomKg, standardUncertaintyPpm, standardUncertaintyAbs);

  let errorBefore = null;
  if (errorBeforeAdjustment != null) {
    const eb = parseCalibrationNumber(errorBeforeAdjustment);
    if (eb.valid) errorBefore = eb.value;
  } else if (point.reading_before_adjustment != null && String(point.reading_before_adjustment).trim() !== "") {
    const before = parseCalibrationNumber(point.reading_before_adjustment);
    if (before.valid) errorBefore = before.value - nom.value;
  }

  const indicationContrib = errorBefore != null
    ? { value: (Math.abs(errorBefore) / 2) / SQRT3, valid: true }
    : { value: indication.valid ? (Math.abs(indication.value) / 2) / SQRT3 : 0, valid: true };

  const uRep = repeatability.valid ? repeatability.value : 0;
  const uRes = resolutionContrib.valid ? resolutionContrib.value : 0;
  const uPad = standardContrib.valid ? standardContrib.value : 0;
  const uInd = indicationContrib.valid ? indicationContrib.value : 0;

  const components = [uRep, uRes, uPad, uInd].filter((c) => Number.isFinite(c));
  const combinedRes = calculateExpandedUncertainty(components);

  const nReadings = repeatability.n || readings.length;
  const nuRep = nReadings >= 2 ? nReadings - 1 : 100;
  const nu = welchSatterthwaiteNuEff([
    { u: uRep, nu: nuRep },
    { u: uRes, nu: 100 },
    { u: uPad, nu: 100 },
    { u: uInd, nu: 100 },
  ]);

  const k = coverageFactorFromNu(nu);
  const expanded = combinedRes.valid ? k * combinedRes.combined : null;

  const memory = {
    average: avgRes.value,
    indicationError: indication.value,
    errorBeforeAdjustment: errorBefore,
    repeatability: uRep,
    resolutionContribution: uRes,
    standardContribution: uPad,
    indicationContribution: uInd,
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
      repeatability: uRep,
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
