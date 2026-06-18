/** Converte registro de balança (cadastro) para balance_snapshot do certificado. */
export function balanceSnapshotFromScaleRegistration(scale) {
  if (!scale) return {};
  return {
    tag: scale.identification_code || "",
    codigo: scale.identification_code || "",
    fabricante: scale.manufacturer || "",
    modelo: scale.model || "",
    descricao: scale.description || "",
    serie: scale.serial_number || "",
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
