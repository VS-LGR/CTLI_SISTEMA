import { parseImportNumeric, toDbNumeric } from "@/lib/certificateCalculations/parseNumber";
import { resolveResolutionForNominal } from "@/lib/certificateCalculations/pointCalculations";

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
    notes: "",
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
  const enabled = Boolean(
    pt?.point_enabled || pt?.peso_nominal || after.length || before.length || pt?.pesos_padrao_ids?.length,
  );
  return {
    point_number: pointNumber,
    point_enabled: enabled,
    nominal_value: pt?.peso_nominal ?? "",
    readings_before: before.map(String),
    readings_after: after.map(String),
    standard_weight_ids: pt?.pesos_padrao_ids || [],
    resolution: pt?.resolucao || balance.resolucao || "",
    verification_division: pt?.divisao_verificacao || balance.divisao_verificacao || "",
    buoyancy_ppm: pt?.ppm_empuxo || "",
  };
}

/** Converte ponto do painel de volta para coleta (payload manual). */
export function panelPointToColetaPoint(panelPt) {
  const after = panelPt.readings_after || [];
  const before = panelPt.readings_before || [];
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
    resolucao: panelPt.resolution || "",
    divisao_verificacao: panelPt.verification_division || "",
    ppm_empuxo: panelPt.buoyancy_ppm || "",
    point_enabled: panelPt.point_enabled,
  };
}

/** Converte ponto do certificado (DB) para formato do painel. */
export function certificatePointToPanelPoint(pt, balance = {}) {
  const synced = syncLegacyReadingColumns(pt);
  const enabled = synced.point_enabled ?? Boolean(
    synced.nominal_value || synced.readings_after?.length || synced.readings_before?.length
      || synced.standard_weight_ids?.length,
  );
  return {
    id: synced.id,
    point_number: synced.point_number,
    point_enabled: enabled,
    nominal_value: synced.nominal_value != null && synced.nominal_value !== "" ? String(synced.nominal_value) : "",
    readings_before: (synced.readings_before || []).map(String),
    readings_after: (synced.readings_after || []).map(String),
    standard_weight_ids: synced.standard_weight_ids || [],
    resolution: synced.resolution != null && synced.resolution !== "" ? String(synced.resolution) : "",
    verification_division: synced.verification_division || resolveDefaultVerificationDivision(synced.nominal_value, balance),
    buoyancy_ppm: synced.buoyancy_ppm || "",
    notes: synced.notes || "",
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
export function pointToDbPatch(point) {
  const synced = syncLegacyReadingColumns(point);
  const afterNums = synced.readings_after.map((r) => {
    const p = parseImportNumeric(r);
    return p.valid ? p.value : null;
  });
  const beforeNums = synced.readings_before.map((r) => {
    const p = parseImportNumeric(r);
    return p.valid ? p.value : null;
  });

  const patch = {
    point_enabled: Boolean(synced.point_enabled),
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
    resolution: synced.resolution != null && String(synced.resolution).trim()
      ? toDbNumeric(synced.resolution)
      : null,
    verification_division: synced.verification_division || "",
    buoyancy_ppm: synced.buoyancy_ppm || "",
    notes: synced.notes || "",
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
