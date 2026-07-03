import { convertMassValue } from "@/lib/massValueUtils";

export function isLoadBatchItem(item) {
  return Boolean(item?.is_load_batch);
}

function massFieldFromItem(value, itemUnit, targetUnit) {
  if (value == null) return "";
  if (!targetUnit) return String(value);
  const converted = convertMassValue(value, itemUnit || targetUnit, targetUnit);
  return converted != null ? String(converted) : String(value);
}

/** Campos de lote aplicáveis a um ponto do certificado/coleta (sem material — definido no ponto). */
export function loadBatchFieldsFromItem(item, targetUnit = null) {
  if (!isLoadBatchItem(item)) return null;
  const itemUnit = item.unit || targetUnit || "g";
  return {
    load_batch_weight_id: item.id,
    load_batch_nominal: massFieldFromItem(item.nominal_value, itemUnit, targetUnit),
    load_batch_conventional_value: massFieldFromItem(item.conventional_value, itemUnit, targetUnit),
    load_batch_expanded_uncertainty: massFieldFromItem(item.expanded_uncertainty, itemUnit, targetUnit),
  };
}
