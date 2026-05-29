/** Valores seguros para PDF/UI — nunca exibir erros técnicos. */
export function displayValue(v) {
  if (v === null || v === undefined) return "-";
  if (typeof v === "number" && Number.isNaN(v)) return "-";
  const s = String(v).trim();
  if (!s || s === "null" || s === "undefined" || s === "NaN") return "-";
  if (s === "#N/D" || s === "#VALOR!") return "-";
  return s;
}

export function formatRequestNumber(requestNumber, requestYear) {
  const n = String(requestNumber || 0).padStart(3, "0");
  return `${n}/${requestYear || new Date().getFullYear()}`;
}

export function formatDateBr(iso) {
  if (!iso) return "-";
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return displayValue(iso);
  return d.toLocaleDateString("pt-BR");
}
