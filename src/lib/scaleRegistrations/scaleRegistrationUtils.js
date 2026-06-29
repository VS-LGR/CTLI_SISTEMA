/** Converte registro de balança (cadastro) para balance_snapshot do certificado. */
import { decimalPlacesFromResolution } from "@/lib/certificateCalculations";
import { normalizePointMaxTolerances } from "@/lib/certificateCalculations/pointMaxToleranceVerification";

export function emptyPointMaxTolerancesForm() {
  return Array.from({ length: 10 }, (_, i) => ({ point: i + 1, value: "" }));
}

export function pointMaxTolerancesFromForm(formValues = {}) {
  return Array.from({ length: 10 }, (_, i) => {
    const point = i + 1;
    const key = `point_max_tolerance_p${point}`;
    const fromKey = formValues[key];
    const fromArray = Array.isArray(formValues.point_max_tolerances)
      ? formValues.point_max_tolerances.find((p) => p.point === point)?.value
      : undefined;
    return {
      point,
      value: String(fromKey ?? fromArray ?? "").trim(),
    };
  }).filter((p) => p.value !== "");
}

export function formValuesFromPointMaxTolerances(raw) {
  const normalized = normalizePointMaxTolerances(raw);
  const values = emptyPointMaxTolerancesForm();
  for (const entry of normalized) {
    const idx = entry.point - 1;
    if (idx >= 0 && idx < 10) values[idx].value = entry.value ?? "";
  }
  const out = { point_max_tolerances: values };
  values.forEach(({ point, value }) => {
    out[`point_max_tolerance_p${point}`] = value;
  });
  return out;
}

export function balanceSnapshotFromScaleRegistration(scale) {
  if (!scale) return {};
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
    unidade: scale.unit || "g",
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
    point_max_tolerances: normalizePointMaxTolerances(scale.point_max_tolerances),
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

  const divisao = balanca.divisao_verificacao || balanca.resolucao || "";

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
      ? String(balanca.portaria_inmetro || "aplicável").trim()
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
    unit: balanca.unidade || "g",
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
    point_max_tolerances: normalizePointMaxTolerances(balanca.point_max_tolerances),
    active: true,
  };
}

export function decimalPlacesForPoint(balanceSnapshot, pointNumber) {
  const dp = balanceSnapshot?.decimal_places || {};
  const key = `p${pointNumber}`;
  const v = dp[key];
  return Number.isFinite(Number(v)) ? Number(v) : 2;
}

export const PLATFORM_TYPE_OPTIONS = [
  { value: "quadrada", label: "Plataforma Quadrada" },
  { value: "redonda", label: "Plataforma Redonda" },
  { value: "rodoviaria", label: "Plataforma Rodoviária" },
];
