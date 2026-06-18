const INVALID = new Set(["", "#n/d", "#div/0!", "#valor!", "#ref!", "#num!", "undefined", "null", "nan"]);

const UNIT_SUFFIX = /\s*(kg|g|mg|kpa|hpa|mbar|bar|pa|°c|ºc|%\s*r\.?\s*h\.?|%\s*ur|ur|rh|%)\s*$/i;

function stripUnitSuffixes(value) {
  let s = value;
  let prev;
  do {
    prev = s;
    s = s.replace(UNIT_SUFFIX, "").trim();
  } while (s !== prev);
  return s;
}

export function parseCalibrationNumber(raw) {
  if (raw == null) return { value: null, valid: false, reason: "Valor ausente" };
  const s = String(raw).trim().replace(",", ".");
  if (INVALID.has(s.toLowerCase())) return { value: null, valid: false, reason: "Valor inválido" };
  if (!s) return { value: null, valid: false, reason: "Valor ausente" };
  const n = Number(s);
  if (!Number.isFinite(n)) return { value: null, valid: false, reason: "Não numérico" };
  return { value: n, valid: true, reason: "" };
}

/** Converte valores livres da coleta (unidades, vírgula, #N/D) para número de banco. */
export function parseImportNumeric(raw) {
  if (raw == null) return { value: null, valid: false, reason: "Valor ausente", raw };
  let s = String(raw).trim();
  if (!s || s === "-" || s === "—") return { value: null, valid: false, reason: "Valor ausente", raw };
  if (INVALID.has(s.toLowerCase())) return { value: null, valid: false, reason: "Valor inválido", raw };

  s = stripUnitSuffixes(s.replace(",", "."));

  const match = s.match(/^-?\d+(?:\.\d+)?/);
  if (match) {
    const n = Number(match[0]);
    if (Number.isFinite(n)) return { value: n, valid: true, reason: "", raw };
  }

  const n = Number(s);
  if (Number.isFinite(n)) return { value: n, valid: true, reason: "", raw };
  return { value: null, valid: false, reason: "Não numérico", raw };
}

export function toDbNumeric(raw) {
  const parsed = parseImportNumeric(raw);
  return parsed.valid ? parsed.value : null;
}

export function formatCalcDisplay(n, decimals = 4) {
  if (n == null || !Number.isFinite(n)) return "—";
  return n.toFixed(decimals).replace(/\.?0+$/, (m) => (m === "." ? "" : m));
}
