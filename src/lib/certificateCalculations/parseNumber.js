const INVALID = new Set(["", "#n/d", "#div/0!", "#valor!", "undefined", "null", "nan"]);

export function parseCalibrationNumber(raw) {
  if (raw == null) return { value: null, valid: false, reason: "Valor ausente" };
  const s = String(raw).trim().replace(",", ".");
  if (INVALID.has(s.toLowerCase())) return { value: null, valid: false, reason: "Valor inválido" };
  if (!s) return { value: null, valid: false, reason: "Valor ausente" };
  const n = Number(s);
  if (!Number.isFinite(n)) return { value: null, valid: false, reason: "Não numérico" };
  return { value: n, valid: true, reason: "" };
}

export function formatCalcDisplay(n, decimals = 4) {
  if (n == null || !Number.isFinite(n)) return "—";
  return n.toFixed(decimals).replace(/\.?0+$/, (m) => (m === "." ? "" : m));
}
