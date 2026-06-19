import { parseCalibrationNumber } from "@/lib/certificateCalculations/parseNumber";

/** Exibe status de calibração do peso (1º / 2º). */
export function formatWeightStatus(weightStatus) {
  if (weightStatus === "1") return "1º";
  if (weightStatus === "2") return "2º";
  return "—";
}

/**
 * Deriva do padrão conforme planilha matriz:
 * - 1ª calibração (status "1"): deriva = incerteza expandida (Ue)
 * - 2ª+ calibração (status "2" ou ausência de 1º): deriva = VVC − VVC anterior
 */
export function calculateStandardDrift({
  weightStatus,
  expandedUncertainty,
  conventionalValue,
  previousConventionalValue,
}) {
  const isFirst = weightStatus === "1" || weightStatus === "1º";

  if (isFirst) {
    const ue = parseCalibrationNumber(expandedUncertainty);
    if (!ue.valid) {
      return { value: null, valid: false, reason: "Informe a incerteza expandida (Ue) para calcular a deriva na 1ª calibração" };
    }
    return { value: ue.value, valid: true, reason: "" };
  }

  const vvc = parseCalibrationNumber(conventionalValue);
  const prev = parseCalibrationNumber(previousConventionalValue);
  if (!vvc.valid) {
    return { value: null, valid: false, reason: "Informe o valor convencional (V.V.C) atual" };
  }
  if (!prev.valid) {
    return {
      value: null,
      valid: false,
      reason: "Informe o valor convencional anterior ou use a ação \"Nova calibração do peso\"",
    };
  }
  return { value: vvc.value - prev.value, valid: true, reason: "" };
}

/** Deriva a partir de um registro standard_weight_items (cadastro ou snapshot). */
export function driftFromWeightItem(item) {
  if (!item) return { value: null, valid: false, reason: "Peso não encontrado" };
  const computed = calculateStandardDrift({
    weightStatus: item.weight_status,
    expandedUncertainty: item.expanded_uncertainty,
    conventionalValue: item.conventional_value,
    previousConventionalValue: item.previous_conventional_value,
  });
  if (computed.valid) return computed;
  const stored = parseCalibrationNumber(item.standard_drift);
  if (stored.valid) return stored;
  return computed;
}

/** Formata deriva para exibição (preserva sinal). */
export function formatDriftDisplay(driftResult, unit = "g") {
  if (!driftResult?.valid || driftResult.value == null) return "—";
  const s = String(driftResult.value).replace(".", ",");
  return unit ? `${s} ${unit}` : s;
}
