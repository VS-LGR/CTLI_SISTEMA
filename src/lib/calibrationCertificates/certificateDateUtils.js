/** Adiciona 1 ano a uma data ISO (YYYY-MM-DD). */
export function addOneYear(isoDate) {
  if (!isoDate) return null;
  const parts = String(isoDate).split("-").map(Number);
  if (parts.length < 3 || !parts[0]) return null;
  const [y, m, d] = parts;
  const date = new Date(y, m - 1, d);
  date.setFullYear(date.getFullYear() + 1);
  const ny = date.getFullYear();
  const nm = String(date.getMonth() + 1).padStart(2, "0");
  const nd = String(date.getDate()).padStart(2, "0");
  return `${ny}-${nm}-${nd}`;
}

/** Valor padrão de validade a partir da data de calibração. */
export function defaultValidityDate(calibrationDate) {
  return addOneYear(calibrationDate) || null;
}
