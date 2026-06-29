import { parseCalibrationNumber } from "./parseNumber";

export const MAX_TOLERANCE_POINT_COUNT = 10;

/** Normaliza array do cadastro: [{ point, value }, ...] */
export function normalizePointMaxTolerances(raw) {
  if (!Array.isArray(raw)) return [];
  const byPoint = new Map();
  for (const entry of raw) {
    const point = Number(entry?.point);
    if (!Number.isInteger(point) || point < 1 || point > MAX_TOLERANCE_POINT_COUNT) continue;
    const value = entry?.value != null ? String(entry.value).trim() : "";
    byPoint.set(point, { point, value });
  }
  return Array.from(byPoint.values()).sort((a, b) => a.point - b.point);
}

/** Mapa pointNumber → valor numérico ou null se vazio/inválido. */
export function toleranceMapFromRaw(raw) {
  const map = new Map();
  for (const { point, value } of normalizePointMaxTolerances(raw)) {
    if (!value) continue;
    const parsed = parseCalibrationNumber(value);
    if (parsed.valid && parsed.value >= 0) {
      map.set(point, parsed.value);
    }
  }
  return map;
}

export function toleranceForPoint(tolerances, pointNumber) {
  const map = tolerances instanceof Map
    ? tolerances
    : toleranceMapFromRaw(tolerances);
  return map.has(pointNumber) ? map.get(pointNumber) : null;
}

export function hasAnyConfiguredTolerance(tolerances) {
  const map = tolerances instanceof Map
    ? tolerances
    : toleranceMapFromRaw(tolerances);
  return map.size > 0;
}

/**
 * testValue = |Erro + Incerteza|
 * aprovado se testValue <= toleranceMax
 */
export function evaluatePointMaxTolerance(error, uncertainty, toleranceMax) {
  const err = parseCalibrationNumber(error);
  const u = parseCalibrationNumber(uncertainty);
  const tol = parseCalibrationNumber(toleranceMax);

  if (!tol.valid || tol.value < 0) {
    return { result: "nao_avaliado", valid: false, reason: "Tolerância inválida" };
  }
  if (!err.valid) {
    return {
      result: "nao_avaliado",
      valid: false,
      reason: "Erro não calculado",
      toleranceMax: tol.value,
    };
  }
  if (!u.valid) {
    return {
      result: "nao_avaliado",
      valid: false,
      reason: "Incerteza não calculada",
      toleranceMax: tol.value,
    };
  }

  const testValue = Math.abs(err.value + u.value);
  const within = testValue <= tol.value;

  return {
    result: within ? "aprovado" : "alerta",
    valid: true,
    testValue,
    toleranceMax: tol.value,
    error: err.value,
    uncertainty: u.value,
  };
}

export function generalMaxToleranceResult(pointResults = []) {
  const evaluated = pointResults.filter((p) => p.result === "aprovado" || p.result === "alerta");
  if (!evaluated.length) return "nao_avaliado";
  return evaluated.some((p) => p.result === "alerta") ? "alerta" : "aprovado";
}

/**
 * Avalia pontos do certificado contra tolerâncias do cadastro da balança.
 * @returns {{ pointResults, general, errors }}
 */
export function evaluateCertificateMaxTolerance(points = [], tolerancesRaw = []) {
  const tolMap = toleranceMapFromRaw(tolerancesRaw);
  const pointResults = [];
  const errors = [];

  if (tolMap.size === 0) {
    return { pointResults: [], general: "nao_avaliado", errors: [] };
  }

  for (const [pointNumber, toleranceMax] of tolMap.entries()) {
    const pt = (points || []).find((p) => p.point_number === pointNumber);
    const hasData = pt && (pt.nominal_value || pt.reading1) && pt.calc_status === "calculado";

    if (!hasData) {
      errors.push(`Ponto P${pointNumber}: cálculo incompleto para verificação de tolerância`);
      pointResults.push({
        pointNumber,
        toleranceMax,
        result: "nao_avaliado",
        reason: "Cálculo incompleto",
      });
      continue;
    }

    const ev = evaluatePointMaxTolerance(
      pt.indication_error,
      pt.expanded_uncertainty,
      toleranceMax,
    );

    pointResults.push({
      pointNumber,
      toleranceMax: ev.toleranceMax ?? toleranceMax,
      error: ev.error ?? null,
      uncertainty: ev.uncertainty ?? null,
      testValue: ev.testValue ?? null,
      result: ev.result,
      reason: ev.reason || "",
    });

    if (ev.result === "nao_avaliado" && ev.reason) {
      errors.push(`Ponto P${pointNumber}: ${ev.reason}`);
    }
  }

  pointResults.sort((a, b) => a.pointNumber - b.pointNumber);
  const general = generalMaxToleranceResult(pointResults);

  return { pointResults, general, errors };
}

/** Mensagens de erro para bloqueio na emissão. */
export function formatMaxToleranceEmitErrors(pointResults = []) {
  return pointResults
    .filter((p) => p.result === "alerta")
    .map((p) => {
      const tv = p.testValue != null ? p.testValue.toFixed(4).replace(".", ",") : "—";
      const tol = p.toleranceMax != null ? p.toleranceMax.toFixed(4).replace(".", ",") : "—";
      return `Verificação de tolerância: P${p.pointNumber} (|E+U|=${tv}) excede tolerância máxima (${tol})`;
    });
}
