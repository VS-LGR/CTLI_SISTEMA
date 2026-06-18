import { parseImportNumeric, toDbNumeric } from "@/lib/certificateCalculations/parseNumber";

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
  const result = {
    point_number: pointNumber,
    standard_weight_ids: Array.isArray(pt?.pesos_padrao_ids) ? pt.pesos_padrao_ids : [],
    notes: "",
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

  return result;
}

export function sanitizePointRowForDb(point) {
  const next = { ...point };
  for (const field of POINT_NUMERIC_FIELDS) {
    if (next[field] == null || next[field] === "") {
      next[field] = null;
      continue;
    }
    if (typeof next[field] === "number" && Number.isFinite(next[field])) continue;
    next[field] = toDbNumeric(next[field]);
  }
  return next;
}

export function sanitizePointsForDb(points = []) {
  return points.map((p) => sanitizePointRowForDb(p));
}

export function enrichEnvironmentalAirDensity(environmental, certificate = {}) {
  if (!environmental) return environmental;
  if (environmental.air_density != null && String(environmental.air_density).trim()) {
    return environmental;
  }
  const snap = environmental.snapshot || {};
  const rep = certificate.repeatability_snapshot || {};
  return {
    ...environmental,
    air_density: snap.massa_especifica || rep.massa_especifica_estimada || "",
  };
}
