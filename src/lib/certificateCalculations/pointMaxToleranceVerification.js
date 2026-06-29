import { parseCalibrationNumber } from "./parseNumber";
import { sumNominalFromWeightIds, describeWeightComposition } from "./pointCalculations";
import {
  formatMassDisplay,
  massLoadKey,
  massToGrams,
  normalizeMassUnit,
} from "@/lib/massValueUtils";

export const MAX_TOLERANCE_ENTRY_COUNT = 10;
/** @deprecated Mantido para compatibilidade com cadastros legados por P1–P10. */
export const MAX_TOLERANCE_POINT_COUNT = 10;

function parseToleranceMax(raw) {
  const value = String(raw ?? "").trim();
  if (!value) return null;
  const parsed = parseCalibrationNumber(value);
  if (!parsed.valid || parsed.value < 0) return null;
  return parsed.value;
}

/**
 * Normaliza tolerâncias por pesagem: [{ nominal_value, unit, max_tolerance }, ...]
 * Aceita legado [{ point, value }] quando ainda não migrado.
 */
export function normalizePointMaxTolerances(raw) {
  if (!Array.isArray(raw)) return [];

  const loadEntries = [];
  const legacyEntries = [];
  const seenLoadKeys = new Set();

  for (const entry of raw) {
    const nominalRaw = entry?.nominal_value ?? entry?.load_value;
    const maxTolRaw = entry?.max_tolerance ?? entry?.tolerance_max ?? entry?.value;

    if (nominalRaw != null && String(nominalRaw).trim() !== "") {
      const nominal_value = String(nominalRaw).trim();
      const unit = normalizeMassUnit(entry?.unit, "g");
      const max_tolerance = String(maxTolRaw ?? "").trim();
      if (!max_tolerance) continue;
      const key = massLoadKey(nominal_value, unit);
      if (!key || seenLoadKeys.has(key)) continue;
      seenLoadKeys.add(key);
      loadEntries.push({ nominal_value, unit, max_tolerance });
      continue;
    }

    const point = Number(entry?.point);
    if (Number.isInteger(point) && point >= 1 && point <= MAX_TOLERANCE_POINT_COUNT) {
      const max_tolerance = String(maxTolRaw ?? "").trim();
      if (!max_tolerance) continue;
      legacyEntries.push({ point, max_tolerance, _legacyPoint: true });
    }
  }

  loadEntries.sort((a, b) => {
    const ga = massToGrams(a.nominal_value, a.unit) ?? 0;
    const gb = massToGrams(b.nominal_value, b.unit) ?? 0;
    return ga - gb;
  });
  legacyEntries.sort((a, b) => a.point - b.point);

  return [...loadEntries, ...legacyEntries];
}

export function isLoadBasedMaxToleranceEntry(entry) {
  return Boolean(entry?.nominal_value) && !entry?._legacyPoint;
}

export function buildLoadToleranceMap(entries = []) {
  const map = new Map();
  for (const entry of entries) {
    if (!isLoadBasedMaxToleranceEntry(entry)) continue;
    const key = massLoadKey(entry.nominal_value, entry.unit);
    const parsedTolerance = parseToleranceMax(entry.max_tolerance);
    if (!key || parsedTolerance == null) continue;
    map.set(key, {
      ...entry,
      parsedTolerance,
    });
  }
  return map;
}

export function findToleranceForNominal(nominalValue, unit, loadMap) {
  const key = massLoadKey(nominalValue, unit);
  if (!key || !(loadMap instanceof Map)) return null;
  return loadMap.get(key) ?? null;
}

/**
 * Valor nominal para casar com tolerância cadastrada: soma V.N. dos pesos padrão.
 * Sem pesos vinculados, usa o V.R. informado manualmente no ponto.
 */
export function resolveToleranceNominalForPoint(point, weightItems = [], targetUnit = "g") {
  const ids = point?.standard_weight_ids;
  if (Array.isArray(ids) && ids.length > 0) {
    const sum = sumNominalFromWeightIds(ids, weightItems, targetUnit);
    if (sum.valid && sum.value != null) {
      return { value: sum.value, valid: true, source: "peso_padrao" };
    }
    return { value: null, valid: false, source: "peso_padrao", reason: sum.reason || "Pesos não encontrados" };
  }
  const manual = parseCalibrationNumber(point?.nominal_value);
  if (manual.valid) {
    return { value: manual.value, valid: true, source: "vr_manual" };
  }
  return { value: null, valid: false, source: "none" };
}

/** @deprecated Preferir buildLoadToleranceMap — legado por número de ponto. */
export function toleranceMapFromRaw(raw) {
  const map = new Map();
  for (const entry of normalizePointMaxTolerances(raw)) {
    if (!entry._legacyPoint) continue;
    const parsed = parseToleranceMax(entry.max_tolerance);
    if (parsed != null) map.set(entry.point, parsed);
  }
  return map;
}

export function hasAnyConfiguredTolerance(tolerances) {
  return normalizePointMaxTolerances(tolerances).some((entry) => {
    if (entry._legacyPoint) return parseToleranceMax(entry.max_tolerance) != null;
    return (
      String(entry.nominal_value || "").trim() !== ""
      && parseToleranceMax(entry.max_tolerance) != null
    );
  });
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

function pushPointResult(pointResults, errors, pt, toleranceMax, ev, matchMeta = {}) {
  pointResults.push({
    pointNumber: pt.point_number,
    nominalValue: matchMeta.nominalValue ?? pt.nominal_value,
    nominalUnit: matchMeta.unit ?? null,
    nominalDisplay: matchMeta.display ?? null,
    nominalSource: matchMeta.source ?? null,
    weightCompositionDisplay: matchMeta.weightCompositionDisplay ?? null,
    toleranceMax: ev.toleranceMax ?? toleranceMax,
    error: ev.error ?? null,
    uncertainty: ev.uncertainty ?? null,
    testValue: ev.testValue ?? null,
    result: ev.result,
    reason: ev.reason || "",
  });
  if (ev.result === "nao_avaliado" && ev.reason) {
    const label = matchMeta.display || `P${pt.point_number}`;
    errors.push(`${label}: ${ev.reason}`);
  }
}

/**
 * Avalia pontos calculados contra tolerâncias cadastradas por valor de pesagem.
 * @returns {{ pointResults, general, errors }}
 */
export function evaluateCertificateMaxTolerance(
  points = [],
  tolerancesRaw = [],
  { defaultUnit = "g", weightItems = [] } = {},
) {
  const normalized = normalizePointMaxTolerances(tolerancesRaw);
  const loadEntries = normalized.filter(isLoadBasedMaxToleranceEntry);
  const legacyEntries = normalized.filter((e) => e._legacyPoint);
  const pointResults = [];
  const errors = [];

  if (!normalized.length) {
    return { pointResults: [], general: "nao_avaliado", errors: [] };
  }

  const balanceUnit = normalizeMassUnit(defaultUnit, "g");

  if (loadEntries.length > 0) {
    const loadMap = buildLoadToleranceMap(loadEntries);

    for (const pt of points || []) {
      if (!(pt.nominal_value || pt.reading1 || pt.standard_weight_ids?.length)) continue;

      const nominalRes = resolveToleranceNominalForPoint(pt, weightItems, balanceUnit);
      if (!nominalRes.valid) {
        if (pt.standard_weight_ids?.length) {
          errors.push(`P${pt.point_number}: não foi possível obter valor nominal dos pesos padrão para verificação de tolerância`);
        }
        continue;
      }

      const match = findToleranceForNominal(nominalRes.value, balanceUnit, loadMap);
      if (!match) continue;

      const display = formatMassDisplay(nominalRes.value, balanceUnit, { fallback: "" });
      let weightCompositionDisplay = null;
      if (nominalRes.source === "peso_padrao" && pt.standard_weight_ids?.length) {
        const comp = describeWeightComposition(pt.standard_weight_ids, weightItems, { targetUnit: balanceUnit });
        if (comp.valid && comp.parts.length > 1) {
          weightCompositionDisplay = comp.compositionDisplay;
        }
      }
      const meta = {
        unit: balanceUnit,
        display: display || `P${pt.point_number}`,
        nominalValue: nominalRes.value,
        source: nominalRes.source,
        weightCompositionDisplay,
      };

      if (pt.calc_status !== "calculado") {
        errors.push(`${meta.display} (P${pt.point_number}): cálculo incompleto para verificação de tolerância`);
        pointResults.push({
          pointNumber: pt.point_number,
          nominalValue: nominalRes.value,
          nominalUnit: balanceUnit,
          nominalDisplay: meta.display,
          nominalSource: nominalRes.source,
          weightCompositionDisplay,
          toleranceMax: match.parsedTolerance,
          result: "nao_avaliado",
          reason: "Cálculo incompleto",
        });
        continue;
      }

      const ev = evaluatePointMaxTolerance(
        pt.indication_error,
        pt.expanded_uncertainty,
        match.parsedTolerance,
      );
      pushPointResult(pointResults, errors, pt, match.parsedTolerance, ev, meta);
    }
  } else if (legacyEntries.length > 0) {
    const tolMap = toleranceMapFromRaw(legacyEntries);

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
      pushPointResult(pointResults, errors, pt, toleranceMax, ev, {
        display: `P${pointNumber}`,
      });
    }
  }

  pointResults.sort((a, b) => a.pointNumber - b.pointNumber);
  return {
    pointResults,
    general: generalMaxToleranceResult(pointResults),
    errors,
  };
}

export function formatMaxTolerancePointLabel(result) {
  if (result?.weightCompositionDisplay && result?.nominalDisplay) {
    return `${result.weightCompositionDisplay} → ${result.nominalDisplay}`;
  }
  if (result?.nominalDisplay) return result.nominalDisplay;
  if (result?.nominalValue != null && result?.nominalValue !== "") {
    return formatMassDisplay(result.nominalValue, result.nominalUnit || "g", { fallback: `P${result.pointNumber}` });
  }
  return `P${result.pointNumber}`;
}

/** Mensagens de erro para bloqueio na emissão. */
export function formatMaxToleranceEmitErrors(pointResults = []) {
  return pointResults
    .filter((p) => p.result === "alerta")
    .map((p) => {
      const tv = p.testValue != null ? p.testValue.toFixed(4).replace(".", ",") : "—";
      const tol = p.toleranceMax != null ? p.toleranceMax.toFixed(4).replace(".", ",") : "—";
      const load = formatMaxTolerancePointLabel(p);
      return `Verificação de tolerância: ${load} (P${p.pointNumber}, |E+U|=${tv}) excede tolerância máxima (${tol})`;
    });
}

export function maxToleranceAlertPoints(pointResults = []) {
  return (pointResults || []).filter((p) => p.result === "alerta");
}

export function maxToleranceAlertPointSet(pointResults = []) {
  return new Set(maxToleranceAlertPoints(pointResults).map((p) => p.pointNumber));
}

export function maxToleranceAlertSummary(pointResults = []) {
  return maxToleranceAlertPoints(pointResults)
    .map((p) => `${formatMaxTolerancePointLabel(p)} (P${p.pointNumber})`)
    .join(", ");
}

export function isMaxToleranceAlert(pointNumber, pointResults = []) {
  return maxToleranceAlertPointSet(pointResults).has(pointNumber);
}

/** Classes Tailwind para linhas/células com tolerância máxima excedida. */
export const MAX_TOLERANCE_ALERT_ROW_CLASS =
  "bg-amber-50 border-l-4 border-l-amber-500 ring-1 ring-inset ring-amber-200/80";
export const MAX_TOLERANCE_ALERT_VALUE_CLASS = "text-amber-950 font-semibold";
