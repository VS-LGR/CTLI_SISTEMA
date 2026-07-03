/** Converte registro de balança (cadastro) para balance_snapshot do certificado. */
import { decimalPlacesFromResolution } from "@/lib/certificateCalculations";
import { normalizePointMaxTolerances } from "@/lib/certificateCalculations/pointMaxToleranceVerification";
import { normalizeMassUnit } from "@/lib/massValueUtils";

export function emptyLoadMaxTolerances(defaultUnit = "g") {
  return [{ nominal_value: "", unit: normalizeMassUnit(defaultUnit, "g"), max_tolerance: "" }];
}

/** @deprecated Use emptyLoadMaxTolerances */
export function emptyPointMaxTolerancesForm() {
  return emptyLoadMaxTolerances();
}

export function loadMaxTolerancesFromForm(rows = [], defaultUnit = "g") {
  return normalizePointMaxTolerances(
    (rows || []).map((row) => ({
      nominal_value: row?.nominal_value ?? "",
      unit: row?.unit || defaultUnit,
      max_tolerance: row?.max_tolerance ?? "",
    })),
  );
}

/** @deprecated Use loadMaxTolerancesFromForm */
export function pointMaxTolerancesFromForm(formValues = {}, defaultUnit = "g") {
  if (Array.isArray(formValues.point_max_tolerances)) {
    return loadMaxTolerancesFromForm(formValues.point_max_tolerances, defaultUnit);
  }
  return [];
}

/** Remove chaves só de formulário antes de persistir em scale_registrations. */
export function omitPointMaxToleranceFormKeys(formValues = {}) {
  return Object.fromEntries(
    Object.entries(formValues).filter(
      ([key]) => !/^point_max_tolerance_p\d+$/.test(key) && key !== "point_max_tolerances",
    ),
  );
}

export function formRowsFromPointMaxTolerances(raw, defaultUnit = "g") {
  if (Array.isArray(raw)) {
    if (raw.length === 0) return emptyLoadMaxTolerances(defaultUnit);
    const hasLoadRows = raw.some((e) => e?.nominal_value != null || e?.max_tolerance != null);
    if (hasLoadRows) {
      return raw.map((entry) => ({
        nominal_value: entry.nominal_value ?? "",
        unit: normalizeMassUnit(entry.unit, defaultUnit),
        max_tolerance: entry.max_tolerance ?? "",
      }));
    }
  }
  const normalized = normalizePointMaxTolerances(raw).filter((e) => !e._legacyPoint);
  if (!normalized.length) return emptyLoadMaxTolerances(defaultUnit);
  return normalized.map((entry) => ({
    nominal_value: entry.nominal_value ?? "",
    unit: entry.unit || defaultUnit,
    max_tolerance: entry.max_tolerance ?? "",
  }));
}

/** @deprecated Use formRowsFromPointMaxTolerances */
export function formValuesFromPointMaxTolerances(raw) {
  return { point_max_tolerances: formRowsFromPointMaxTolerances(raw) };
}

export function balanceSnapshotFromScaleRegistration(scale) {
  if (!scale) return {};
  const unit = normalizeMassUnit(scale.unit, "g");
  const pointMaxTolerances = Array.isArray(scale.point_max_tolerances)
    ? scale.point_max_tolerances.map((entry) => ({ ...entry, unit: entry?.unit || unit }))
    : scale.point_max_tolerances;
  return {
    tag: scale.tag || scale.identification_code || "",
    codigo: scale.identification_code || "",
    fabricante: scale.manufacturer || "",
    modelo: scale.model || "",
    descricao: scale.description || "",
    serie: scale.serial_number || "",
    local: scale.local_instalacao || "",
    etiqueta_ipem: scale.etiqueta_ipem || "",
    portaria_inmetro: scale.portaria_inmetro || "",
    tipo_balanca: scale.tipo_balanca || "",
    capacidade: scale.capacity_1 || "",
    capacidade_2: scale.capacity_2 || "",
    capacidade_3: scale.capacity_3 || "",
    resolucao: scale.resolution_1 || "",
    resolucao_2: scale.resolution_2 || "",
    resolucao_3: scale.resolution_3 || "",
    divisao_verificacao: scale.verification_division_1 || "",
    divisao_verificacao_2: scale.verification_division_2 || "",
    divisao_verificacao_3: scale.verification_division_3 || "",
    classe: scale.instrument_class || "",
    ponto_trabalho: scale.working_point || "",
    unidade: unit,
    tipo_plataforma: scale.platform_type || "quadrada",
    decimal_places: {
      p1: scale.decimal_places_p1 ?? 2,
      p2: scale.decimal_places_p2 ?? 2,
      p3: scale.decimal_places_p3 ?? 2,
      p4: scale.decimal_places_p4 ?? 2,
      p5: scale.decimal_places_p5 ?? 2,
      p6: scale.decimal_places_p6 ?? 2,
      p7: scale.decimal_places_p7 ?? 2,
      p8: scale.decimal_places_p8 ?? 2,
      p9: scale.decimal_places_p9 ?? 2,
      p10: scale.decimal_places_p10 ?? 2,
    },
    point_max_tolerances: normalizePointMaxTolerances(pointMaxTolerances),
  };
}

/** Converte balance_snapshot / payload.balanca para insert em scale_registrations. */
export function buildScaleRegistrationFromBalance({
  tenantId,
  endCustomerId,
  balanca = {},
  legalMetrology = false,
}) {
  const defaultDecimals = decimalPlacesFromResolution(balanca.resolucao) ?? 2;
  const pointDecimals = (n) => {
    const fromBalance = balanca.decimal_places?.[`p${n}`];
    return Number.isFinite(Number(fromBalance)) ? Number(fromBalance) : defaultDecimals;
  };

  const unit = normalizeMassUnit(balanca.unidade, "g");
  const divisao = balanca.divisao_verificacao || balanca.resolucao || "";
  const pointMaxTolerances = Array.isArray(balanca.point_max_tolerances)
    ? balanca.point_max_tolerances.map((entry) => ({ ...entry, unit: entry?.unit || unit }))
    : balanca.point_max_tolerances;

  return {
    tenant_id: tenantId,
    end_customer_id: endCustomerId || null,
    serial_number: String(balanca.serie ?? "").trim(),
    identification_code: String(balanca.codigo || balanca.tag || "").trim(),
    tag: String(balanca.tag || "").trim(),
    manufacturer: String(balanca.fabricante || "").trim(),
    model: String(balanca.modelo || "").trim(),
    description: String(balanca.descricao || "").trim(),
    tipo_balanca: String(balanca.tipo_balanca || "").trim(),
    local_instalacao: String(balanca.local || "").trim(),
    etiqueta_ipem: String(balanca.etiqueta_ipem || "").trim(),
    portaria_inmetro: legalMetrology
      ? String(balanca.portaria_inmetro || "Portaria INMETRO nº 157/2022").trim()
      : String(balanca.portaria_inmetro || "").trim(),
    capacity_1: String(balanca.capacidade || "").trim(),
    capacity_2: String(balanca.capacidade_2 || "").trim(),
    capacity_3: String(balanca.capacidade_3 || "").trim(),
    resolution_1: String(balanca.resolucao || "").trim(),
    resolution_2: String(balanca.resolucao_2 || "").trim(),
    resolution_3: String(balanca.resolucao_3 || "").trim(),
    verification_division_1: String(divisao).trim(),
    verification_division_2: String(balanca.divisao_verificacao_2 || "").trim(),
    verification_division_3: String(balanca.divisao_verificacao_3 || "").trim(),
    instrument_class: String(balanca.classe || "").trim(),
    working_point: String(balanca.ponto_trabalho || "").trim(),
    unit,
    platform_type: balanca.tipo_plataforma || "quadrada",
    decimal_places_p1: pointDecimals(1),
    decimal_places_p2: pointDecimals(2),
    decimal_places_p3: pointDecimals(3),
    decimal_places_p4: pointDecimals(4),
    decimal_places_p5: pointDecimals(5),
    decimal_places_p6: pointDecimals(6),
    decimal_places_p7: pointDecimals(7),
    decimal_places_p8: pointDecimals(8),
    decimal_places_p9: pointDecimals(9),
    decimal_places_p10: pointDecimals(10),
    point_max_tolerances: normalizePointMaxTolerances(pointMaxTolerances),
    active: true,
  };
}

export function decimalPlacesForPoint(balanceSnapshot, pointNumber) {
  const dp = balanceSnapshot?.decimal_places || {};
  const key = `p${pointNumber}`;
  const v = dp[key];
  return Number.isFinite(Number(v)) ? Number(v) : 2;
}

/** Quantidade de faixas de indicação preenchidas (1 a 3). */
export function countScaleRanges(scaleOrBalance = {}) {
  const caps = [
    scaleOrBalance.capacity_1 || scaleOrBalance.capacidade,
    scaleOrBalance.capacity_2 || scaleOrBalance.capacidade_2,
    scaleOrBalance.capacity_3 || scaleOrBalance.capacidade_3,
  ];
  const filled = caps.filter((c) => c != null && String(c).trim() !== "");
  return filled.length || 0;
}

/** Resumo textual das faixas para listagens e PDF. */
export function formatScaleRangesSummary(scaleOrBalance = {}, unit = "g", { skipFirst = false } = {}) {
  const u = scaleOrBalance.unit || scaleOrBalance.unidade || unit || "g";
  const ranges = [
    {
      cap: scaleOrBalance.capacity_1 || scaleOrBalance.capacidade,
      res: scaleOrBalance.resolution_1 || scaleOrBalance.resolucao,
    },
    {
      cap: scaleOrBalance.capacity_2 || scaleOrBalance.capacidade_2,
      res: scaleOrBalance.resolution_2 || scaleOrBalance.resolucao_2,
    },
    {
      cap: scaleOrBalance.capacity_3 || scaleOrBalance.capacidade_3,
      res: scaleOrBalance.resolution_3 || scaleOrBalance.resolucao_3,
    },
  ];
  const filled = ranges
    .filter((r) => r.cap && String(r.cap).trim() && r.res && String(r.res).trim())
    .map((r) => `até ${r.cap} ${u} (d=${r.res})`);
  const parts = skipFirst ? filled.slice(1) : filled;
  return parts.join("; ");
}

export const PLATFORM_TYPE_OPTIONS = [
  { value: "quadrada", label: "Plataforma Quadrada" },
  { value: "redonda", label: "Plataforma Redonda" },
  { value: "rodoviaria", label: "Plataforma Rodoviária" },
];
