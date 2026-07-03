import { parseCalibrationNumber } from "./parseNumber";
import { ppmFromPresetId } from "./materialConstants";

/** PR-7.6 Tabela 01 — formação por número do ponto (P2 → l1_p1, P3 → l2_p1, …). */
export function formationKeyForPoint(pointNumber, useLoadBatch = false) {
  const n = Number(pointNumber);
  if (!useLoadBatch || !Number.isFinite(n) || n < 2) return null;
  return `l${n - 1}_p1`;
}

/** PR-7.6 Tabela 01 — upLC = uc do passo anterior na cadeia de formação. */
const FORMATION_UP_LC_SOURCE = {
  l1_p1: "p1",
  l2_p1: "l1_p1",
  l3_p1: "l2_p1",
  l4_p1: "l3_p1",
  l5_p1: "l4_p1",
  l6_p1: "l5_p1",
};

/**
 * uc de referência para upLC conforme Tabela 01.
 * chainMap: { p1: { combinedUncertainty }, l1_p1: { ... }, point2: { ... } }
 */
export function upLcFromTable01(formationKey, chainMap = {}, calculatedPoints = []) {
  if (!formationKey) return { value: 0, valid: true, source: "" };

  const sourceKey = FORMATION_UP_LC_SOURCE[formationKey];
  if (sourceKey && chainMap[sourceKey]?.combinedUncertainty != null) {
    const uc = Number(chainMap[sourceKey].combinedUncertainty);
    if (Number.isFinite(uc)) {
      return { value: uc, valid: true, source: sourceKey };
    }
  }

  // Fallback certificado: P2 → uc(P1), Pn → uc(Pn-1)
  const pointNum = formationKey.match(/^l(\d+)_p1$/);
  if (pointNum) {
    const n = Number(pointNum[1]) + 1;
    const prev = calculatedPoints.find((p) => p.point_number === n - 1);
    const uc = prev?.calculation_memory?.combinedUncertainty
      ?? prev?.standard_uncertainty;
    if (Number.isFinite(uc)) {
      return { value: uc, valid: true, source: `point_${n - 1}` };
    }
  }

  return { value: 0, valid: true, source: "none" };
}

/**
 * Fórmula planilha P2 (col AI) quando AN ≠ "não" — termo adicional em uc².
 * upLC = √((COUNT−1−2×up_P1+2×up)² + 2×(COUNT−1)×(ua+ur)²)
 */
export function upLcFromSpreadsheetFormula({ ua = 0, ur = 0, up = 0, upP1 = 0, nReadings = 3 }) {
  const n = Number(nReadings);
  if (!Number.isFinite(n) || n < 2) return 0;
  const countMinusOne = n - 1;
  const termA = countMinusOne - 2 * upP1 + 2 * up;
  const term1 = termA ** 2;
  const term2 = 2 * countMinusOne * (ua + ur) ** 2;
  return Math.sqrt(term1 + term2);
}

/** Multiplicador M — PR-7.6 §5.4.2 Tabela 01 (P1=1, L1+P1=2, L2+P1=3, ...). */
export function errorMultiplierForFormation(formationKey) {
  if (!formationKey || formationKey === "p1") return 1;
  const withP1 = String(formationKey).match(/^l(\d+)_p1$/i);
  if (withP1) return Number(withP1[1]) + 1;
  const lotOnly = String(formationKey).match(/^l(\d+)$/i);
  if (lotOnly) return Number(lotOnly[1]);
  return 1;
}

/** V.R. efetivo com lote: PR-7.6 §5.4.2 — Vc × M; fallback legado soma lote quando M=1. */
export function referenceWithLoadBatch(weightReference, loadBatchValue, unit = "g", multiplier = 1) {
  const base = parseCalibrationNumber(weightReference);
  const lot = parseCalibrationNumber(loadBatchValue);
  if (!base.valid) return { value: null, valid: false };
  const m = Number(multiplier);
  if (Number.isFinite(m) && m > 1) {
    return { value: base.value * m, valid: true, multiplier: m, method: "multiplier" };
  }
  const lotVal = lot.valid ? lot.value : 0;
  return { value: base.value + lotVal, valid: true, multiplier: 1, method: "sum" };
}

/** PPM empuxo: pesos + lote (PR-7.6 — somar ppm do lote ao vci). */
export function buoyancyPpmCombined(weightPpm, loadBatchPresetId, extraLotCount = 0) {
  const w = parseCalibrationNumber(weightPpm);
  const basePpm = w.valid && w.value > 0 ? w.value : 0;
  const lotPpm = loadBatchPresetId ? (ppmFromPresetId(loadBatchPresetId) ?? 0) : 0;
  const extra = Number.isFinite(extraLotCount) ? extraLotCount : 0;
  return basePpm + lotPpm * Math.max(0, extra);
}

/** Registra uc calculado na cadeia de formação (coleta verso + pontos). */
export function buildFormationChain(calculatedPoints = [], repeatabilitySnapshot = {}) {
  const chain = {};

  calculatedPoints.forEach((pt) => {
    if (pt.point_number === 1) {
      const uc = pt.calculation_memory?.combinedUncertainty ?? pt.standard_uncertainty;
      if (Number.isFinite(uc)) chain.p1 = { combinedUncertainty: uc, point_number: 1 };
    }
    const fk = pt.load_batch_formation || formationKeyForPoint(pt.point_number, pt.use_load_batch);
    if (fk && Number.isFinite(pt.calculation_memory?.combinedUncertainty)) {
      chain[fk] = { combinedUncertainty: pt.calculation_memory.combinedUncertainty, point_number: pt.point_number };
    }
  });

  (repeatabilitySnapshot?.linhas || []).forEach((line) => {
    if (line.key && line.formation_uc != null) {
      chain[line.key] = { combinedUncertainty: Number(line.formation_uc) };
    }
  });

  return chain;
}

/** Aplica flags de lote a partir da coleta (verso repetitividade). */
export function applyLoadBatchFromColeta(pointNumber, repeatabilitySnapshot = {}) {
  if (pointNumber < 2) {
    return {
      use_load_batch: false,
      load_batch_formation: "",
      load_batch_nominal: null,
      load_batch_material_preset: "",
    };
  }

  const rep = repeatabilitySnapshot || {};
  if (rep.aplicavel === false) {
    return { use_load_batch: false, load_batch_formation: "", load_batch_nominal: null, load_batch_material_preset: "" };
  }

  const formation = formationKeyForPoint(pointNumber, true);
  const linhas = rep.linhas || [];
  const line = linhas.find((l) => l.key === formation);

  const lineHasData = Boolean(
    line && (
      line.valor_nominal != null && String(line.valor_nominal).trim() !== ""
      || line.leitura1 || line.leitura2 || line.leitura3
    ),
  );

  const useLoadBatch = lineHasData;

  return {
    use_load_batch: useLoadBatch,
    load_batch_formation: useLoadBatch ? formation : "",
    load_batch_nominal: line?.valor_nominal ?? null,
    load_batch_material_preset: line?.material_preset || rep.material_preset || "aco",
    error_multiplier: errorMultiplierForFormation(formation),
  };
}
