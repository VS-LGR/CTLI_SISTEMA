import { parseImportNumeric, toDbNumeric } from "@/lib/certificateCalculations/parseNumber";
import { calculateAirDensityFromEnvironmental } from "@/lib/certificateCalculations/environmentalCalculations";
import { syncLegacyReadingColumns, readingsAfterFromPoint, readingsBeforeFromPoint } from "./certificatePointUtils";

const POINT_NUMERIC_FIELDS = [
  "nominal_value",
  "reading_before_adjustment",
  "reading1",
  "reading2",
  "reading3",
];

const COLETA_POINT_FIELD_LABELS = {
  nominal_value: "peso nominal",
  reading_before_adjustment: "leitura antes",
  reading1: "1ª repetição",
  reading2: "2ª repetição",
  reading3: "3ª repetição",
};

const COLETA_POINT_SOURCE = {
  nominal_value: "peso_nominal",
  reading_before_adjustment: "leitura_antes",
  reading1: "rep1",
  reading2: "rep2",
  reading3: "rep3",
};

export function mapColetaPointForDb(pt, pointNumber, warnings = []) {
  const afterRaw = [pt?.rep1, pt?.rep2, pt?.rep3, pt?.rep4, pt?.rep5, pt?.rep6]
    .filter((r) => r != null && String(r).trim() !== "");
  const beforeRaw = pt?.leitura_antes
    ? [pt.leitura_antes]
    : (Array.isArray(pt?.readings_antes) ? pt.readings_antes : []);

  const result = {
    point_number: pointNumber,
    standard_weight_ids: Array.isArray(pt?.pesos_padrao_ids) ? pt.pesos_padrao_ids : [],
    notes: "",
    point_enabled: Boolean(
      pt?.point_enabled || pt?.peso_nominal || afterRaw.length || beforeRaw.length || pt?.pesos_padrao_ids?.length,
    ),
    verification_division: pt?.divisao_verificacao || "",
    buoyancy_ppm: pt?.ppm_empuxo || "",
    readings_before: [],
    readings_after: [],
  };

  for (const field of POINT_NUMERIC_FIELDS) {
    const raw = pt?.[COLETA_POINT_SOURCE[field]];
    const parsed = parseImportNumeric(raw);
    if (raw != null && String(raw).trim() && !parsed.valid) {
      warnings.push(
        `Ponto ${pointNumber}: "${String(raw).trim()}" (${COLETA_POINT_FIELD_LABELS[field]}) não é numérico — valor ignorado`,
      );
    }
    result[field] = parsed.valid ? parsed.value : null;
  }

  const afterParsed = afterRaw.map((r) => parseImportNumeric(r)).filter((p) => p.valid).map((p) => p.value);
  const beforeParsed = beforeRaw.map((r) => parseImportNumeric(r)).filter((p) => p.valid).map((p) => p.value);
  result.readings_after = afterParsed;
  result.readings_before = beforeParsed;
  if (afterParsed.length) {
    result.reading1 = afterParsed[0] ?? null;
    result.reading2 = afterParsed[1] ?? null;
    result.reading3 = afterParsed[2] ?? null;
  }
  if (beforeParsed.length) {
    result.reading_before_adjustment = beforeParsed[0] ?? null;
  }

  if (pt?.resolucao) {
    const res = parseImportNumeric(pt.resolucao);
    result.resolution = res.valid ? res.value : null;
  }

  return result;
}

export function sanitizePointRowForDb(point) {
  const synced = syncLegacyReadingColumns(point);
  const next = { ...synced };
  for (const field of POINT_NUMERIC_FIELDS) {
    if (next[field] == null || next[field] === "") {
      next[field] = null;
      continue;
    }
    if (typeof next[field] === "number" && Number.isFinite(next[field])) continue;
    next[field] = toDbNumeric(next[field]);
  }
  if (next.resolution != null && next.resolution !== "" && typeof next.resolution !== "number") {
    next.resolution = toDbNumeric(next.resolution);
  }
  next.readings_before = readingsBeforeFromPoint(next)
    .map((r) => parseImportNumeric(r))
    .filter((p) => p.valid)
    .map((p) => p.value);
  next.readings_after = readingsAfterFromPoint(next)
    .map((r) => parseImportNumeric(r))
    .filter((p) => p.valid)
    .map((p) => p.value);
  return next;
}

export function sanitizePointsForDb(points = []) {
  return points.map((p) => sanitizePointRowForDb(p));
}

const STANDARD_NUMERIC_FIELDS = ["uncertainty"];

export function sanitizeStandardRowForDb(standard) {
  const next = { ...standard };
  for (const field of STANDARD_NUMERIC_FIELDS) {
    if (next[field] == null || next[field] === "") {
      next[field] = null;
      continue;
    }
    if (typeof next[field] === "number" && Number.isFinite(next[field])) continue;
    next[field] = toDbNumeric(next[field]);
  }
  return next;
}

export function sanitizeStandardsForDb(standards = []) {
  return standards.map((s) => sanitizeStandardRowForDb(s));
}

const CALCULATED_POINT_NUMERIC_FIELDS = [
  "nominal_value",
  "reading_before_adjustment",
  "reading1",
  "reading2",
  "reading3",
  "average_reading",
  "indication_error",
  "error_before_adjustment",
  "repeatability",
  "resolution",
  "standard_uncertainty",
  "expanded_uncertainty",
  "coverage_factor",
  "degrees_of_freedom",
  "tolerance_positive",
  "tolerance_negative",
];

export function sanitizeCalculatedPointPatchForDb(patch) {
  const next = { ...patch };
  for (const field of CALCULATED_POINT_NUMERIC_FIELDS) {
    if (!(field in next)) continue;
    if (next[field] == null || next[field] === "") {
      next[field] = null;
      continue;
    }
    if (typeof next[field] === "number" && Number.isFinite(next[field])) continue;
    next[field] = toDbNumeric(next[field]);
  }
  return next;
}

export function resolveEnvironmentalFields(environmental, certificate = {}) {
  if (!environmental) return null;
  const snap = environmental.snapshot || {};
  const collPayload = certificate.collection_snapshot?.payload || {};
  const ambSnap = collPayload.ambiente || snap || {};
  return {
    initial_temperature: environmental.initial_temperature || ambSnap.temp_inicial,
    final_temperature: environmental.final_temperature || ambSnap.temp_final,
    initial_humidity: environmental.initial_humidity || ambSnap.umidade_inicial,
    final_humidity: environmental.final_humidity || ambSnap.umidade_final,
    initial_pressure: environmental.initial_pressure || ambSnap.pressao_inicial,
    final_pressure: environmental.final_pressure || ambSnap.pressao_final,
  };
}

export function enrichEnvironmentalAirDensity(environmental, certificate = {}) {
  if (!environmental) return environmental;
  const merged = resolveEnvironmentalFields(environmental, certificate);
  const calc = calculateAirDensityFromEnvironmental(merged);
  return {
    ...environmental,
    air_density: calc.valid ? String(calc.value) : "",
  };
}
