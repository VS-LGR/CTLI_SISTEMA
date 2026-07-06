import { parseCalibrationNumber } from "@/lib/certificateCalculations/parseNumber";

export const TBH_QUANTITIES = {
  temperature: {
    key: "temperature",
    label: "Temperatura",
    unit: "°C",
    ambienteFields: { initial: "temp_inicial", final: "temp_final" },
    certFields: { initial: "initial_temperature", final: "final_temperature" },
  },
  humidity: {
    key: "humidity",
    label: "Umidade",
    unit: "%UR",
    ambienteFields: { initial: "umidade_inicial", final: "umidade_final" },
    certFields: { initial: "initial_humidity", final: "final_humidity" },
  },
  pressure: {
    key: "pressure",
    label: "Pressão",
    unit: "hPa",
    ambienteFields: { initial: "pressao_inicial", final: "pressao_final" },
    certFields: { initial: "initial_pressure", final: "final_pressure" },
  },
};

const EQUIPMENT_QUANTITIES = {
  termo_higrometro: ["temperature", "humidity"],
  barometro: ["pressure"],
  thermo_baro_higrometro: ["temperature", "humidity", "pressure"],
};

/** Excel SLOPE(known_y, known_x) / INCLINAÇÃO(G;F). */
export function linearRegressionSlopeIntercept(knownX, knownY) {
  const n = knownX.length;
  if (n < 2 || n !== knownY.length) {
    return { slope: null, intercept: null, valid: false, reason: "Mínimo 2 pontos válidos" };
  }
  let sumX = 0;
  let sumY = 0;
  for (let i = 0; i < n; i += 1) {
    sumX += knownX[i];
    sumY += knownY[i];
  }
  const meanX = sumX / n;
  const meanY = sumY / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i += 1) {
    const dx = knownX[i] - meanX;
    num += dx * (knownY[i] - meanY);
    den += dx * dx;
  }
  if (den === 0) {
    return { slope: null, intercept: null, valid: false, reason: "Variância zero nos pontos do aparelho" };
  }
  const slope = num / den;
  const intercept = meanY - slope * meanX;
  return { slope, intercept, valid: true, reason: "", pointCount: n };
}

export function correctDeviceReading(deviceReading, slope, intercept) {
  if (!Number.isFinite(deviceReading) || !Number.isFinite(slope) || !Number.isFinite(intercept)) {
    return null;
  }
  return deviceReading * slope + intercept;
}

export function computeCorrectionDelta(corrected, device) {
  if (!Number.isFinite(corrected) || !Number.isFinite(device)) return null;
  return corrected - device;
}

export function getEnabledQuantities(equipmentType) {
  const keys = EQUIPMENT_QUANTITIES[equipmentType] || EQUIPMENT_QUANTITIES.thermo_baro_higrometro;
  return keys.map((k) => TBH_QUANTITIES[k]);
}

export function emptyTbhRange(label = "Faixa 1") {
  return { label, min: "", max: "", points: [] };
}

export function emptyTbhCorrectionCalibration() {
  return {
    temperature: { ranges: [emptyTbhRange("Faixa 1")] },
    humidity: { ranges: [emptyTbhRange("Faixa 1")] },
    pressure: { ranges: [emptyTbhRange("Faixa 1")] },
  };
}

function normalizePoints(points) {
  return (points || []).map((p) => ({
    device: p?.device ?? "",
    supplier: p?.supplier ?? "",
  }));
}

function normalizeRange(range, index) {
  return {
    label: range?.label?.trim() || `Faixa ${index + 1}`,
    min: range?.min != null ? String(range.min) : "",
    max: range?.max != null ? String(range.max) : "",
    points: normalizePoints(range?.points),
  };
}

/** Migra legado { points } → { ranges: [{ points }] }. */
export function normalizeTbhCorrectionCalibration(raw) {
  const base = emptyTbhCorrectionCalibration();
  if (!raw || typeof raw !== "object") return base;

  for (const q of Object.keys(base)) {
    const block = raw[q];
    if (!block || typeof block !== "object") continue;

    if (Array.isArray(block.ranges) && block.ranges.length > 0) {
      base[q].ranges = block.ranges.map((r, i) => normalizeRange(r, i));
      continue;
    }

    if (Array.isArray(block.points)) {
      base[q].ranges = [{
        label: "Faixa única",
        min: "",
        max: "",
        points: normalizePoints(block.points),
      }];
    }
  }
  return base;
}

export function getQuantityRanges(calibration, quantityKey) {
  return normalizeTbhCorrectionCalibration(calibration)[quantityKey]?.ranges || [];
}

function parseBound(value) {
  if (value == null || String(value).trim() === "") return null;
  const parsed = parseCalibrationNumber(value);
  return parsed.valid ? parsed.value : null;
}

/**
 * Escolhe a faixa cuja leitura está entre min e max (inclusive).
 * Se min/max ausentes, trata como faixa aberta. Fallback: primeira faixa com pontos válidos.
 */
export function pickRangeForReading(value, ranges = []) {
  const parsed = parseCalibrationNumber(value);
  if (!parsed.valid) {
    const withPoints = ranges.find((r) => (r.points || []).length >= 2);
    return withPoints || ranges[0] || null;
  }
  const v = parsed.value;

  for (const range of ranges) {
    const min = parseBound(range.min);
    const max = parseBound(range.max);
    const minOk = min == null || v >= min;
    const maxOk = max == null || v <= max;
    if (minOk && maxOk) return range;
  }

  const withPoints = ranges.find((r) => (r.points || []).length >= 2);
  return withPoints || ranges[0] || null;
}

function parsePointPair(point) {
  const x = parseCalibrationNumber(point?.device);
  const y = parseCalibrationNumber(point?.supplier);
  if (!x.valid || !y.valid) return null;
  return { x: x.value, y: y.value };
}

export function buildRegressionFromPoints(points = []) {
  const xs = [];
  const ys = [];
  for (const pt of points) {
    const parsed = parsePointPair(pt);
    if (!parsed) continue;
    xs.push(parsed.x);
    ys.push(parsed.y);
  }
  const regression = linearRegressionSlopeIntercept(xs, ys);
  if (!regression.valid) {
    return { ...regression, pointCount: xs.length };
  }
  return regression;
}

export function buildRegressionForRange(range) {
  return buildRegressionFromPoints(range?.points || []);
}

export function formatTbhCorrectedValue(value, quantityKey) {
  if (value == null || !Number.isFinite(value)) return "";
  const decimals = quantityKey === "pressure" ? 1 : 1;
  return value.toFixed(decimals).replace(".", ",");
}

function correctReadingFromCert(deviceRaw, envCert, quantityKey) {
  const cal = normalizeTbhCorrectionCalibration(envCert?.tbh_correction_calibration);
  const ranges = cal[quantityKey]?.ranges || [];
  const range = pickRangeForReading(deviceRaw, ranges);
  const points = range?.points || [];
  const regression = buildRegressionFromPoints(points);
  if (!regression.valid) {
    return {
      valid: false,
      reason: regression.reason || "Pontos de calibração insuficientes",
      slope: null,
      intercept: null,
      device: null,
      corrected: null,
      delta: null,
      range_label: range?.label || "",
    };
  }
  const deviceParsed = parseCalibrationNumber(deviceRaw);
  if (!deviceParsed.valid) {
    return {
      valid: false,
      reason: "Leitura do aparelho inválida ou ausente",
      slope: regression.slope,
      intercept: regression.intercept,
      device: null,
      corrected: null,
      delta: null,
      range_label: range?.label || "",
    };
  }
  const corrected = correctDeviceReading(deviceParsed.value, regression.slope, regression.intercept);
  return {
    valid: Number.isFinite(corrected),
    reason: Number.isFinite(corrected) ? "" : "Cálculo inválido",
    slope: regression.slope,
    intercept: regression.intercept,
    pointCount: regression.pointCount,
    device: deviceParsed.value,
    corrected,
    delta: computeCorrectionDelta(corrected, deviceParsed.value),
    range_label: range?.label || "",
  };
}

function resolveDeviceReading(ambienteFields, rawSnapshot, fieldKey) {
  const raw = rawSnapshot?.[fieldKey];
  if (raw != null && String(raw).trim() !== "") return raw;
  return ambienteFields[fieldKey];
}

function buildEquipmentCorrectionBlock(envCert, ambienteFields, rawSnapshot, quantities, phase) {
  const equipmentType = envCert?.equipment_type || "thermo_baro_higrometro";
  const enabled = getEnabledQuantities(equipmentType).map((q) => q.key);
  const quantityResults = {};
  const errors = [];

  for (const qKey of enabled) {
    if (!quantities.includes(qKey)) continue;
    const meta = TBH_QUANTITIES[qKey];
    const fieldKey = meta.ambienteFields[phase];
    const rawValue = resolveDeviceReading(ambienteFields, rawSnapshot, fieldKey);
    const result = correctReadingFromCert(rawValue, envCert, qKey);
    quantityResults[qKey] = {
      field: fieldKey,
      phase,
      ...result,
      correctedDisplay: result.valid ? formatTbhCorrectedValue(result.corrected, qKey) : "",
    };
    if (!result.valid && rawValue != null && String(rawValue).trim() !== "") {
      errors.push(`${meta.label} (${phase}): ${result.reason}`);
    }
  }

  return { quantityResults, errors };
}

/**
 * Aplica correção TBH ao bloco ambiente da coleta.
 * - 1 TBH: mesma curva em inicial e final.
 * - 2 TBH: TBH1 → inicial; TBH2 → final (fallback TBH1 se TBH2 ausente).
 */
export function applyTbhCorrectionToAmbiente(ambiente = {}, envCertPrimary, envCertSecondary = null, options = {}) {
  const { labelPrimary = "TBH 1", labelSecondary = "TBH 2" } = options;
  const errors = [];
  const byEquipment = [];
  const updated = { ...ambiente };
  const rawSnapshot = { ...(ambiente.tbh_correction_raw || {}) };
  const hasSecondary = envCertSecondary && envCertSecondary.id !== envCertPrimary?.id;

  if (!envCertPrimary?.id) {
    return { ok: false, errors: ["Selecione o termo-baro-higrômetro (Identificação 1)"], updated, byEquipment, rawSnapshot };
  }

  const allQuantityKeys = ["temperature", "humidity", "pressure"];

  const primaryIni = buildEquipmentCorrectionBlock(envCertPrimary, ambiente, rawSnapshot, allQuantityKeys, "initial");
  const primaryFin = hasSecondary
    ? null
    : buildEquipmentCorrectionBlock(envCertPrimary, ambiente, rawSnapshot, allQuantityKeys, "final");

  const secondaryFin = hasSecondary
    ? buildEquipmentCorrectionBlock(envCertSecondary, ambiente, rawSnapshot, allQuantityKeys, "final")
    : null;

  errors.push(...primaryIni.errors);
  if (primaryFin) errors.push(...primaryFin.errors);
  if (secondaryFin) errors.push(...secondaryFin.errors);

  const equipmentBlocks = [];

  const mergeQuantityResults = (results, phase) => {
    for (const [qKey, res] of Object.entries(results)) {
      if (!res.valid) continue;
      const field = TBH_QUANTITIES[qKey].ambienteFields[phase];
      if (rawSnapshot[field] == null || String(rawSnapshot[field]).trim() === "") {
        rawSnapshot[field] = resolveDeviceReading(ambiente, rawSnapshot, field) ?? "";
      }
      updated[field] = formatTbhCorrectedValue(res.corrected, qKey);
    }
  };

  mergeQuantityResults(primaryIni.quantityResults, "initial");
  if (primaryFin) {
    mergeQuantityResults(primaryFin.quantityResults, "final");
  }
  if (secondaryFin) {
    mergeQuantityResults(secondaryFin.quantityResults, "final");
  }

  equipmentBlocks.push({
    cert_id: envCertPrimary.id,
    label: labelPrimary,
    equipment_name: envCertPrimary.equipment_name || labelPrimary,
    phases: {
      initial: primaryIni.quantityResults,
      ...(primaryFin ? { final: primaryFin.quantityResults } : {}),
    },
  });

  if (hasSecondary && secondaryFin) {
    equipmentBlocks.push({
      cert_id: envCertSecondary.id,
      label: labelSecondary,
      equipment_name: envCertSecondary.equipment_name || labelSecondary,
      phases: { final: secondaryFin.quantityResults },
    });
  }

  const appliedFields = Object.keys(updated).filter((k) => {
    const before = ambiente[k];
    const after = updated[k];
    return before !== after && TBH_QUANTITIES && Object.values(TBH_QUANTITIES).some(
      (q) => q.ambienteFields.initial === k || q.ambienteFields.final === k,
    );
  });

  const countValid = (block) => Object.values(block?.quantityResults || {}).filter((r) => r.valid).length;
  const validCount =
    countValid(primaryIni) +
    (primaryFin ? countValid(primaryFin) : 0) +
    (secondaryFin ? countValid(secondaryFin) : 0);

  if (validCount === 0 && errors.length > 0) {
    return { ok: false, errors, updated, byEquipment: equipmentBlocks, rawSnapshot };
  }

  updated.tbh_correction_raw = rawSnapshot;
  updated.tbh_correction_applied = true;
  updated.tbh_correction_meta = {
    applied_at: new Date().toISOString(),
    dual_equipment: hasSecondary,
    by_equipment: equipmentBlocks,
  };

  return {
    ok: validCount > 0,
    errors: validCount > 0 ? errors.filter(Boolean) : errors,
    updated,
    byEquipment: equipmentBlocks,
    rawSnapshot,
    appliedFields,
  };
}

/** Converte ambiente coleta → campos certificado e aplica correção. */
export function applyTbhCorrectionToEnvironmental(environmental = {}, thermoCertId, thermoCertId2, envCerts = [], options = {}) {
  const ambiente = {
    thermo_cert_id: thermoCertId || environmental.thermo_hygrometer_id || "",
    thermo_cert_id_2: thermoCertId2 || environmental.thermo_hygrometer_id_2 || "",
    temp_inicial: environmental.initial_temperature ?? "",
    temp_final: environmental.final_temperature ?? "",
    umidade_inicial: environmental.initial_humidity ?? "",
    umidade_final: environmental.final_humidity ?? "",
    pressao_inicial: environmental.initial_pressure ?? "",
    pressao_final: environmental.final_pressure ?? "",
    tbh_correction_raw: environmental.tbh_correction_raw,
    tbh_correction_meta: environmental.tbh_correction_meta,
    tbh_correction_applied: environmental.tbh_correction_applied,
  };

  const primary = envCerts.find((e) => e.id === ambiente.thermo_cert_id);
  const secondary = envCerts.find((e) => e.id === ambiente.thermo_cert_id_2);
  const result = applyTbhCorrectionToAmbiente(ambiente, primary, secondary, options);

  if (!result.ok) return { ...result, environmental: environmental };

  const env = {
    ...environmental,
    initial_temperature: result.updated.temp_inicial ?? environmental.initial_temperature,
    final_temperature: result.updated.temp_final ?? environmental.final_temperature,
    initial_humidity: result.updated.umidade_inicial ?? environmental.initial_humidity,
    final_humidity: result.updated.umidade_final ?? environmental.final_humidity,
    initial_pressure: result.updated.pressao_inicial ?? environmental.initial_pressure,
    final_pressure: result.updated.pressao_final ?? environmental.final_pressure,
    tbh_correction_raw: result.updated.tbh_correction_raw,
    tbh_correction_meta: result.updated.tbh_correction_meta,
    tbh_correction_applied: result.updated.tbh_correction_applied,
  };

  return { ...result, environmental: env };
}

export function previewRegressionForRange(range) {
  const regression = buildRegressionForRange(range);
  if (!regression.valid) return null;
  return {
    slope: regression.slope,
    intercept: regression.intercept,
    pointCount: regression.pointCount,
  };
}

/** @deprecated use previewRegressionForRange — mantido para compatibilidade com editor legado */
export function previewRegressionForQuantity(calibration, quantityKey, rangeIndex = 0) {
  const ranges = getQuantityRanges(calibration, quantityKey);
  const range = ranges[rangeIndex] || ranges[0];
  return previewRegressionForRange(range);
}

/** Mescla metadados TBH do snapshot ambiental (coleta importada ou edição anterior). */
export function hydrateEnvironmentalTbh(environmental) {
  if (!environmental) return environmental;
  const snap = environmental.snapshot || {};
  return {
    ...environmental,
    tbh_correction_raw: environmental.tbh_correction_raw ?? snap.tbh_correction_raw ?? {},
    tbh_correction_meta: environmental.tbh_correction_meta ?? snap.tbh_correction_meta ?? null,
    tbh_correction_applied: environmental.tbh_correction_applied ?? snap.tbh_correction_applied ?? false,
  };
}

export function buildEnvironmentalSnapshotPatch(environmental) {
  return {
    ...(environmental?.snapshot || {}),
    tbh_correction_raw: environmental?.tbh_correction_raw ?? {},
    tbh_correction_meta: environmental?.tbh_correction_meta ?? null,
    tbh_correction_applied: Boolean(environmental?.tbh_correction_applied),
  };
}
