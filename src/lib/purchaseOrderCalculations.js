/** @param {unknown} v */
export function formatDisplayValue(v) {
  if (v === null || v === undefined || v === "") return "-";
  if (typeof v === "number" && Number.isNaN(v)) return "-";
  const s = String(v).trim();
  if (!s || s === "NaN" || s === "undefined" || s === "null") return "-";
  if (s.startsWith("#")) return "-";
  return s;
}

export function parseNum(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function lineTotal(item) {
  const q = parseNum(item?.quantity, 0);
  const u = parseNum(item?.unit_value, 0);
  return Math.round(q * u * 100) / 100;
}

export function recalcItem(item) {
  return { ...item, total_value: lineTotal(item) };
}

export function orderSubtotal(items = []) {
  return items.reduce((s, it) => s + parseNum(it.total_value ?? lineTotal(it), 0), 0);
}

export function orderFinal(order, items = []) {
  const sub = orderSubtotal(items);
  const discount = parseNum(order?.discount, 0);
  let total = sub - discount;
  if (order?.taxes_mode === "percentual") {
    const pct = parseNum(items[0]?.taxes_percent, 0);
    if (pct > 0) total += (sub * pct) / 100;
  }
  return Math.max(0, Math.round(total * 100) / 100);
}

export function formatCurrencyBRL(value) {
  const n = parseNum(value, 0);
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function totalPieces(items = []) {
  return items.reduce((s, it) => s + parseNum(it.quantity, 0), 0);
}
