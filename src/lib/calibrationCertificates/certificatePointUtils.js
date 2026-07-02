import { parseImportNumeric, toDbNumeric } from "@/lib/certificateCalculations/parseNumber";
import { resolveResolutionForNominal } from "@/lib/certificateCalculations/pointCalculations";
import {
  applyLoadBatchFromColeta,
  formationKeyForPoint,
} from "@/lib/certificateCalculations/loadBatchCalculations";
import { emptySubstituicaoLinhas } from "@/lib/coletaSchema";

/** Campos de lote de carga (coleta ou painel) → formato do painel. */
export function loadBatchFieldsToPanel(point) {
  const pt = point || {};
  return {
    use_load_batch: Boolean(pt.use_load_batch ?? pt.com_lote_carga),
    load_batch_formation: pt.load_batch_formation || pt.formacao_lote || "",
    load_batch_nominal: pt.load_batch_nominal != null && String(pt.load_batch_nominal).trim() !== ""
      ? String(pt.load_batch_nominal)
      : "",
    load_batch_material_preset: pt.load_batch_material_preset || "",
    error_multiplier: pt.error_multiplier != null && String(pt.error_multiplier).trim() !== ""
      ? String(pt.error_multiplier)
      : "",
  };
}

/** Campos de lote do painel → persistência no ponto da coleta. */
export function loadBatchFieldsToColeta(panelFields) {
  return {
    use_load_batch: Boolean(panelFields?.use_load_batch),
    load_batch_formation: panelFields?.load_batch_formation || "",
    load_batch_nominal: panelFields?.load_batch_nominal ?? "",
    load_batch_material_preset: panelFields?.load_batch_material_preset || "",
    error_multiplier: panelFields?.error_multiplier ?? "",
  };
}

function coletaPointHasExplicitLoadBatch(pt) {
  if (!pt) return false;
  if (pt.use_load_batch === true || pt.com_lote_carga === true) return true;
  if (pt.load_batch_nominal != null && String(pt.load_batch_nominal).trim() !== "") return true;
  if (pt.load_batch_formation && String(pt.load_batch_formation).trim() !== "") return true;
  return false;
}

/** Sincroniza pontos da coleta a partir do verso de repetitividade (L1+P1 → P2, …). */
export function syncColetaPontosFromRepeatability(pontos = [], repeatabilitySnapshot = {}, balance = {}) {
  return (pontos || []).map((pt, i) => {
    const pointNumber = i + 1;
    if (pointNumber < 2) return pt;
    if (coletaPointHasExplicitLoadBatch(pt)) return pt;
    const batch = applyLoadBatchFromColeta(pointNumber, repeatabilitySnapshot);
    if (!batch.use_load_batch) return pt;
    const panel = coletaPointToPanelPoint(pt, pointNumber, balance);
    return panelPointToColetaPoint({
      ...panel,
      use_load_batch: batch.use_load_batch,
      load_batch_formation: batch.load_batch_formation,
      load_batch_nominal: batch.load_batch_nominal != null ? String(batch.load_batch_nominal) : "",
      load_batch_material_preset: batch.load_batch_material_preset || "",
      error_multiplier: batch.error_multiplier != null ? String(batch.error_multiplier) : "",
    }, balance);
  });
}

/** Pré-preenche linha do verso quando lote é marcado no painel P2+. */
export function syncRepeatabilityFromPanelPoint(payload, pointNumber, panelPt) {
  if (pointNumber < 2 || !panelPt?.use_load_batch) return payload;
  const formation = panelPt.load_batch_formation || formationKeyForPoint(pointNumber, true);
  if (!formation) return payload;

  const verso = payload.verso || {};
  const rep = verso.repetitividade || {};
  const linhas = rep.linhas?.length ? [...rep.linhas] : emptySubstituicaoLinhas();
  const idx = linhas.findIndex((l) => l.key === formation);
  const existing = idx >= 0 ? linhas[idx] : { key: formation };
  const updated = {
    ...existing,
    valor_nominal: panelPt.load_batch_nominal ?? existing.valor_nominal ?? "",
    material_preset: panelPt.load_batch_material_preset || existing.material_preset || rep.material_preset || "aco",
  };
  if (idx >= 0) linhas[idx] = updated;
  else linhas.push(updated);

  return {
    ...payload,
    verso: {
      ...verso,
      repetitividade: {
        ...rep,
        aplicavel: rep.aplicavel !== false,
        material_preset: panelPt.load_batch_material_preset || rep.material_preset || "aco",
        linhas,
      },
    },
  };
}

/** Leituras depois do ajuste a partir de ponto (DB ou painel). */
export function readingsAfterFromPoint(point) {
  if (Array.isArray(point?.readings_after) && point.readings_after.length) {
    return point.readings_after.map((r) => (r == null ? "" : String(r)));
  }
  return [point?.reading1, point?.reading2, point?.reading3]
    .filter((r) => r != null && String(r).trim() !== "")
    .map(String);
}

/** Leituras antes do ajuste a partir de ponto (DB ou painel). */
export function readingsBeforeFromPoint(point) {
  if (Array.isArray(point?.readings_before) && point.readings_before.length) {
    return point.readings_before.map((r) => (r == null ? "" : String(r)));
  }
  if (point?.reading_before_adjustment != null && String(point.reading_before_adjustment).trim() !== "") {
    return [String(point.reading_before_adjustment)];
  }
  return [];
}

/** Sincroniza colunas legadas reading1..3 com arrays jsonb. */
export function syncLegacyReadingColumns(point) {
  const after = readingsAfterFromPoint(point);
  const before = readingsBeforeFromPoint(point);
  return {
    ...point,
    readings_after: after,
    readings_before: before,
    reading1: after[0] != null && after[0] !== "" ? after[0] : null,
    reading2: after[1] != null && after[1] !== "" ? after[1] : null,
    reading3: after[2] != null && after[2] !== "" ? after[2] : null,
    reading_before_adjustment: before[0] != null && before[0] !== "" ? before[0] : null,
  };
}

export function emptyCertificatePoint(pointNumber) {
  return {
    point_number: pointNumber,
    point_enabled: false,
    nominal_value: null,
    reading_before_adjustment: null,
    reading1: null,
    reading2: null,
    reading3: null,
    readings_before: [],
    readings_after: [],
    standard_weight_ids: [],
    resolution: "",
    verification_division: "",
    buoyancy_ppm: "",
    material_density: "",
    material_preset: "",
    notes: "",
    use_load_batch: false,
    load_batch_formation: "",
    load_batch_nominal: null,
    load_batch_material_preset: "",
    error_multiplier: null,
  };
}

/** Ponto considerado preenchido quando há V.R., leituras, pesos ou lote de carga. */
export function isCertificatePointFilled(point) {
  const synced = syncLegacyReadingColumns(point);
  if (Boolean(synced.use_load_batch)) return true;
  if (synced.load_batch_nominal != null && String(synced.load_batch_nominal).trim() !== "") return true;
  if (synced.nominal_value != null && String(synced.nominal_value).trim() !== "") return true;
  if ((synced.standard_weight_ids || []).length > 0) return true;
  if ((synced.readings_after || []).some((r) => String(r).trim() !== "")) return true;
  if ((synced.readings_before || []).some((r) => String(r).trim() !== "")) return true;
  return false;
}

/** Resolução e divisão de verificação derivadas da balança (cadastro ou manual no certificado). */
export function applyBalanceInstrumentToPoint(point, balance = {}, unit = "g") {
  const synced = syncLegacyReadingColumns(point);
  const filled = isCertificatePointFilled(synced);
  const u = balance?.unidade || unit || "g";
  if (!filled) {
    return {
      ...synced,
      point_enabled: false,
      resolution: "",
      verification_division: "",
    };
  }
  const nominal = synced.nominal_value;
  return {
    ...synced,
    point_enabled: true,
    resolution: resolveDefaultResolutionForPoint(nominal, balance, u),
    verification_division: resolveDefaultVerificationDivision(nominal, balance, u),
  };
}

/** Garante 10 slots P1–P10 para o painel de cadastro. */
export function ensureTenCertificatePoints(points = []) {
  const byNum = Object.fromEntries(
    (points || []).map((p) => [p.point_number, syncLegacyReadingColumns(p)]),
  );
  return Array.from({ length: 10 }, (_, i) => {
    const n = i + 1;
    return byNum[n] || emptyCertificatePoint(n);
  });
}

/** Converte ponto de coleta (payload RE-7.2A) para formato do painel. */
export function coletaPointToPanelPoint(pt, pointNumber, balance = {}) {
  const reps = [pt?.rep1, pt?.rep2, pt?.rep3, pt?.rep4, pt?.rep5, pt?.rep6].filter(
    (r) => r != null && String(r).trim() !== "",
  );
  const before = pt?.leitura_antes ? [String(pt.leitura_antes)] : (pt?.readings_antes || []);
  const after = reps.length ? reps.map(String) : (pt?.readings_depois || []).map(String);
  const panel = {
    point_number: pointNumber,
    nominal_value: pt?.peso_nominal ?? "",
    readings_before: before.map(String),
    readings_after: after.map(String),
    standard_weight_ids: pt?.pesos_padrao_ids || [],
    buoyancy_ppm: pt?.ppm_empuxo || "",
    material_density: pt?.densidade_material || "",
    material_preset: pt?.material_preset || "",
    ...loadBatchFieldsToPanel(pt),
  };
  const withInstrument = applyBalanceInstrumentToPoint(panel, balance);
  return {
    ...withInstrument,
    point_enabled: isCertificatePointFilled(withInstrument),
  };
}

/** Converte ponto do painel de volta para coleta (payload manual). */
export function panelPointToColetaPoint(panelPt, balance = {}) {
  const after = panelPt.readings_after || [];
  const before = panelPt.readings_before || [];
  const withInstrument = applyBalanceInstrumentToPoint(panelPt, balance);
  return {
    peso_nominal: panelPt.nominal_value ?? "",
    leitura_antes: before[0] ?? "",
    readings_antes: before,
    rep1: after[0] ?? "",
    rep2: after[1] ?? "",
    rep3: after[2] ?? "",
    rep4: after[3] ?? "",
    rep5: after[4] ?? "",
    rep6: after[5] ?? "",
    readings_depois: after,
    pesos_padrao_ids: panelPt.standard_weight_ids || [],
    resolucao: withInstrument.resolution || balance.resolucao || "",
    divisao_verificacao: withInstrument.verification_division || balance.divisao_verificacao || "",
    ppm_empuxo: panelPt.buoyancy_ppm || "",
    densidade_material: panelPt.material_density || "",
    material_preset: panelPt.material_preset || "",
    point_enabled: isCertificatePointFilled(panelPt),
    ...loadBatchFieldsToColeta(panelPt),
  };
}

/** Converte ponto do certificado (DB) para formato do painel. */
export function certificatePointToPanelPoint(pt, balance = {}) {
  const synced = syncLegacyReadingColumns(pt);
  const unit = balance?.unidade || "g";
  const withInstrument = applyBalanceInstrumentToPoint(synced, balance, unit);
  return {
    id: withInstrument.id,
    point_number: withInstrument.point_number,
    point_enabled: isCertificatePointFilled(withInstrument),
    nominal_value: withInstrument.nominal_value != null && withInstrument.nominal_value !== ""
      ? String(withInstrument.nominal_value)
      : "",
    readings_before: (withInstrument.readings_before || []).map(String),
    readings_after: (withInstrument.readings_after || []).map(String),
    standard_weight_ids: withInstrument.standard_weight_ids || [],
    buoyancy_ppm: withInstrument.buoyancy_ppm || "",
    material_density: withInstrument.material_density || "",
    material_preset: withInstrument.material_preset || "",
    notes: withInstrument.notes || "",
    use_load_batch: Boolean(withInstrument.use_load_batch),
    load_batch_formation: withInstrument.load_batch_formation || "",
    load_batch_nominal: withInstrument.load_batch_nominal != null && withInstrument.load_batch_nominal !== ""
      ? String(withInstrument.load_batch_nominal)
      : "",
    load_batch_material_preset: withInstrument.load_batch_material_preset || "",
    error_multiplier: withInstrument.error_multiplier != null && withInstrument.error_multiplier !== ""
      ? String(withInstrument.error_multiplier)
      : "",
  };
}

/** Mescla campos do painel no ponto do certificado (estado local). */
export function mergePanelIntoCertificatePoint(existing, panelFields) {
  const merged = syncLegacyReadingColumns({
    ...existing,
    ...panelFields,
  });
  return merged;
}
export function pointToDbPatch(point, balance = {}, unit = "g") {
  const withInstrument = applyBalanceInstrumentToPoint(point, balance, unit);
  const synced = syncLegacyReadingColumns(withInstrument);
  const afterNums = synced.readings_after.map((r) => {
    const p = parseImportNumeric(r);
    return p.valid ? p.value : null;
  });
  const beforeNums = synced.readings_before.map((r) => {
    const p = parseImportNumeric(r);
    return p.valid ? p.value : null;
  });

  const filled = isCertificatePointFilled(synced);
  const resolutionStr = filled ? synced.resolution : "";
  const verificationStr = filled ? synced.verification_division : "";

  const patch = {
    point_enabled: filled,
    nominal_value: synced.nominal_value != null && synced.nominal_value !== ""
      ? toDbNumeric(synced.nominal_value)
      : null,
    reading_before_adjustment: beforeNums[0] ?? null,
    reading1: afterNums[0] ?? null,
    reading2: afterNums[1] ?? null,
    reading3: afterNums[2] ?? null,
    readings_before: beforeNums.filter((v) => v != null),
    readings_after: afterNums.filter((v) => v != null),
    standard_weight_ids: synced.standard_weight_ids || [],
    resolution: resolutionStr != null && String(resolutionStr).trim()
      ? toDbNumeric(resolutionStr)
      : null,
    verification_division: verificationStr || "",
    buoyancy_ppm: synced.buoyancy_ppm || "",
    material_density: synced.material_density || "",
    material_preset: synced.material_preset || "",
    notes: synced.notes || "",
    use_load_batch: Boolean(synced.use_load_batch),
    load_batch_formation: synced.load_batch_formation || "",
    load_batch_nominal: synced.load_batch_nominal != null && synced.load_batch_nominal !== ""
      ? toDbNumeric(synced.load_batch_nominal)
      : null,
    load_batch_material_preset: synced.load_batch_material_preset || "",
    error_multiplier: synced.error_multiplier != null && String(synced.error_multiplier).trim()
      ? toDbNumeric(synced.error_multiplier)
      : null,
  };

  return patch;
}

export function resolveDefaultResolutionForPoint(nominalValue, balance = {}, unit = "g") {
  return resolveResolutionForNominal(nominalValue, balance, unit);
}

export function resolveDefaultVerificationDivision(nominalValue, balance = {}, unit = "g") {
  const nom = parseImportNumeric(nominalValue);
  if (!nom.valid) return balance.divisao_verificacao || "";

  const ranges = [
    { cap: balance.capacidade || balance.capacity_1, div: balance.divisao_verificacao || balance.verification_division_1 },
    { cap: balance.capacidade_2 || balance.capacity_2, div: balance.divisao_verificacao_2 || balance.verification_division_2 },
    { cap: balance.capacidade_3 || balance.capacity_3, div: balance.divisao_verificacao_3 || balance.verification_division_3 },
  ];

  let nomVal = nom.value;
  if (unit === "kg") nomVal *= 1000;

  for (const range of ranges) {
    const cap = parseImportNumeric(range.cap);
    if (!cap.valid || !range.div) continue;
    let capVal = cap.value;
    if (unit === "kg") capVal *= 1000;
    if (nomVal <= capVal) return range.div;
  }
  return ranges.map((r) => r.div).filter(Boolean).pop() || balance.divisao_verificacao || "";
}
