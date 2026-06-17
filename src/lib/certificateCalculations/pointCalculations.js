import { parseCalibrationNumber } from "./parseNumber";

const SQRT3 = Math.sqrt(3);

function stdevSample(values) {
  const n = values.length;
  if (n < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const sumSq = values.reduce((s, v) => s + (v - mean) ** 2, 0);
  return Math.sqrt(sumSq / (n - 1));
}

function effectiveDegreesOfFreedom(repeatability, n) {
  if (!repeatability || repeatability <= 0 || n < 2) return 100;
  const nu = repeatability ** 4 / ((repeatability ** 4) / (n - 1));
  return Number.isFinite(nu) && nu > 0 ? nu : 100;
}

function coverageFactorFromNu(nu) {
  if (!Number.isFinite(nu) || nu <= 0) return 2;
  if (nu >= 100) return 2;
  const alpha = 0.0455;
  const p = 1 - alpha / 2;
  const a = nu - 0.5;
  const b = 48 * a * a;
  const c = ((20700 * a) / b - 98) * a - 16;
  const d = ((20700 * a) / b - 98) * a - 16;
  const x = ((((((((0.000015 * d + 0.001674) * d + 0.016041) * d + 0.049867) * d + 0.107781) * d + 0.199481) * d + 0.328376) * d + 0.5) * d + 1) * d + 1;
  const z = Math.sqrt(2 * nu) * (1 - 1 / (4 * nu) + 1 / (21 * nu * nu));
  const tApprox = z + (((0.010328 * z + 0.802853) * z + 2.515517) / (((0.001308 * z + 0.189269) * z + 1) * z + 1)) / Math.sqrt(nu);
  return Math.max(2, Math.min(tApprox, 3));
}

function toKg(value, unit) {
  if (unit === "kg") return value;
  if (unit === "g") return value / 1000;
  if (unit === "mg") return value / 1e6;
  return value;
}

function halfResolution(resolution, unit) {
  const r = parseCalibrationNumber(resolution);
  if (!r.valid) return { value: null, valid: false, reason: "Resolução inválida" };
  const half = r.value / 2;
  return { value: unit === "g" ? half : half, valid: true, reason: "" };
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

export function calculateStandardUncertaintyContribution(nominalKg, standardUncertaintyPpm) {
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

export function calculateCalibrationPoint(point, { resolution, unit = "g", standardUncertaintyPpm = 0, errorBeforeAdjustment = null } = {}) {
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
  const standardContrib = calculateStandardUncertaintyContribution(nomKg, standardUncertaintyPpm);

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

  const components = [
    repeatability.valid ? repeatability.value : 0,
    resolutionContrib.valid ? resolutionContrib.value : 0,
    standardContrib.valid ? standardContrib.value : 0,
    indicationContrib.valid ? indicationContrib.value : 0,
  ].filter((c) => Number.isFinite(c));

  const combinedRes = calculateExpandedUncertainty(components);
  const nu = effectiveDegreesOfFreedom(repeatability.value, repeatability.n || readings.length);
  const k = coverageFactorFromNu(nu);
  const expanded = combinedRes.valid ? k * combinedRes.combined : null;

  const memory = {
    average: avgRes.value,
    indicationError: indication.value,
    errorBeforeAdjustment: errorBefore,
    repeatability: repeatability.value,
    resolutionContribution: resolutionContrib.value,
    standardContribution: standardContrib.value,
    indicationContribution: indicationContrib.value,
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
      repeatability: repeatability.value,
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
