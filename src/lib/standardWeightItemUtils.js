import { MATERIAL_PRESETS } from "@/lib/certificateCalculations/materialConstants";

export function isLoadBatchItem(item) {
  return Boolean(item?.is_load_batch);
}

export function loadBatchMaterialLabel(presetId) {
  if (!presetId) return "";
  return MATERIAL_PRESETS.find((p) => p.id === presetId)?.label || presetId;
}

/** Campos de lote aplicáveis a um ponto do certificado/coleta. */
export function loadBatchFieldsFromItem(item) {
  if (!isLoadBatchItem(item)) return null;
  return {
    load_batch_weight_id: item.id,
    load_batch_nominal: item.nominal_value != null ? String(item.nominal_value) : "",
    load_batch_material_preset: item.load_batch_material_preset || "aco",
  };
}
