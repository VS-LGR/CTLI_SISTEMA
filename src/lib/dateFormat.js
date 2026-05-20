/** Formata data ISO (yyyy-mm-dd) para dd/mm/aa (padrão BR curto). */
export function fmtDmyShort(isoDate) {
  if (!isoDate) return "—";
  const s = String(isoDate).slice(0, 10);
  const [y, m, d] = s.split("-");
  if (!y || !m || !d) return isoDate;
  return `${d}/${m}/${y.slice(-2)}`;
}

/** Formata data ISO para dd/mm/aaaa. */
export function fmtDmy(isoDate) {
  if (!isoDate) return "—";
  const s = String(isoDate).slice(0, 10);
  const [y, m, d] = s.split("-");
  if (!y || !m || !d) return isoDate;
  return `${d}/${m}/${y}`;
}

/** Valor para export VBA: data ISO → dd/mm/aa ou texto original. */
export function fmtDmyShortForExport(val) {
  if (!val) return "";
  const s = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return fmtDmyShort(s);
  return s;
}
