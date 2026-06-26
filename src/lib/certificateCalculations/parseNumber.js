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

/** Normaliza vírgula/ponto decimal (BR e US) para ponto. */
export function normalizeDecimalString(raw) {
  let s = stripUnitSuffixes(String(raw ?? "").trim());
  if (!s) return s;

  const hasComma = s.includes(",");
  const hasDot = s.includes(".");

  if (hasComma && hasDot) {
    const lastComma = s.lastIndexOf(",");
    const lastDot = s.lastIndexOf(".");
    if (lastComma > lastDot) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      s = s.replace(/,/g, "");
    }
  } else if (hasComma) {
    s = s.replace(",", ".");
  }

  return s;
}

export function parseCalibrationNumber(raw) {
  if (raw == null) return { value: null, valid: false, reason: "Valor ausente" };
  const s = normalizeDecimalString(raw);
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

  s = normalizeDecimalString(s);

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

const SUPERSCRIPT_DIGITS = "⁰¹²³⁴⁵⁶⁷⁸⁹";
const SUPERSCRIPT_MINUS = "⁻";

function formatSuperscriptExponent(exp) {
  const sign = exp < 0 ? SUPERSCRIPT_MINUS : "";
  const digits = String(Math.abs(exp))
    .split("")
    .map((d) => SUPERSCRIPT_DIGITS[Number(d)] ?? d)
    .join("");
  return `${sign}${digits}`;
}

/** Notação científica BR para termos EMP microscópicos (ex.: 1,72×10⁻¹⁴). */
export function fmtEmpScientific(n) {
  if (n == null || !Number.isFinite(n)) return "—";
  if (n === 0) return "0";
  const exp = Math.floor(Math.log10(Math.abs(n)));
  const mantissa = n / 10 ** exp;
  const mStr = mantissa.toFixed(2).replace(".", ",");
  return `${mStr}×10${formatSuperscriptExponent(exp)}`;
}

/**
 * Formata grandezas EMP (X, Y, Urel, uPaRel) — evita mascarar ~10⁻¹⁴ como zero.
 * |n| < 10⁻⁹ → científica; |n| < 10⁻⁵ → até 12 casas; senão formatCalcDisplay.
 */
export function fmtEmpMicro(n, decimals = 8) {
  if (n == null || !Number.isFinite(n)) return "—";
  if (n === 0) return "0";
  const abs = Math.abs(n);
  if (abs < 1e-9) return fmtEmpScientific(n);
  if (abs < 1e-5) {
    return n.toFixed(Math.max(decimals, 12)).replace(/\.?0+$/, (m) => (m === "." ? "" : m));
  }
  return formatCalcDisplay(n, decimals);
}

/** Casas decimais de exibição a partir da resolução cadastrada (ex.: "0,0004" → 4). */
export function decimalPlacesFromResolution(resolution) {
  if (resolution == null || String(resolution).trim() === "") return null;
  const normalized = normalizeDecimalString(resolution);
  if (!normalized) return null;
  const dotIdx = normalized.indexOf(".");
  if (dotIdx === -1) return 0;
  const fraction = normalized.slice(dotIdx + 1);
  if (!fraction) return 0;
  return fraction.length;
}
