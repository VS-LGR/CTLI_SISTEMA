export function isLoadBatchItem(item) {
  return Boolean(item?.is_load_batch);
}

/** Campos de lote aplicáveis a um ponto do certificado/coleta (sem material — definido no ponto). */
export function loadBatchFieldsFromItem(item) {
  if (!isLoadBatchItem(item)) return null;
  return {
    load_batch_weight_id: item.id,
    load_batch_nominal: item.nominal_value != null ? String(item.nominal_value) : "",
    load_batch_conventional_value: item.conventional_value != null ? String(item.conventional_value) : "",
    load_batch_expanded_uncertainty: item.expanded_uncertainty != null ? String(item.expanded_uncertainty) : "",
  };
}
