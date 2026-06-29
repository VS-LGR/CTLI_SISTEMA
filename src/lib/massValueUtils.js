export const MASS_UNIT_OPTIONS = [
  { value: "mg", label: "mg" },
  { value: "g", label: "g" },
  { value: "kg", label: "kg" },
];

const VALID_UNITS = new Set(MASS_UNIT_OPTIONS.map((o) => o.value));

/** Aceita apenas dígitos, vírgula e ponto decimal. */
export function sanitizeMassNumericInput(raw) {
  if (raw == null) return "";
  let s = String(raw);
  let out = "";
  let sepUsed = false;
  for (const ch of s) {
    if (ch >= "0" && ch <= "9") {
      out += ch;
    } else if ((ch === "," || ch === ".") && !sepUsed) {
      out += ch;
      sepUsed = true;
    }
  }
  return out;
}

export function parseMassNumber(value) {
  if (value == null || value === "") return null;
  const n = Number(String(value).trim().replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export function normalizeMassUnit(unit, fallback = "g") {
  const u = String(unit || "").trim().toLowerCase();
  if (VALID_UNITS.has(u)) return u;
  return fallback && VALID_UNITS.has(fallback) ? fallback : "g";
}

/** Converte string legada "1000 g" ou "500 g + 1 kg" em valor/unidade (primeiro par). */
export function parseLegacyMassString(raw, defaultUnit = "g") {
  const s = String(raw || "").trim();
  if (!s) return { valor: "", unidade: defaultUnit };

  const onlyNum = parseMassNumber(s);
  if (onlyNum != null && s === String(s).replace(",", ".").match(/^[\d.,]+$/)?.[0]) {
    return { valor: sanitizeMassNumericInput(s), unidade: defaultUnit };
  }

  const match = s.match(/^([\d.,]+)\s*(mg|g|kg)\b/i);
  if (match) {
    return {
      valor: sanitizeMassNumericInput(match[1]),
      unidade: normalizeMassUnit(match[2], defaultUnit),
    };
  }

  const numOnly = s.match(/^([\d.,]+)/);
  if (numOnly) {
    return { valor: sanitizeMassNumericInput(numOnly[1]), unidade: defaultUnit };
  }

  return { valor: s, unidade: defaultUnit };
}

export function formatMassDisplay(valor, unidade, { fallback = "—" } = {}) {
  const v = String(valor ?? "").trim();
  if (!v) return fallback === null ? "" : fallback;
  const u = normalizeMassUnit(unidade, "");
  return u ? `${v} ${u}`.trim() : v;
}

export function resolveMassFields(record, {
  valorKey,
  unidadeKey,
  legacyKey,
  defaultUnit = "g",
}) {
  let valor = String(record?.[valorKey] ?? "").trim();
  let unidade = normalizeMassUnit(record?.[unidadeKey], defaultUnit);

  if (!valor && legacyKey && record?.[legacyKey]) {
    const parsed = parseLegacyMassString(record[legacyKey], defaultUnit);
    valor = parsed.valor;
    unidade = parsed.unidade || unidade;
  }

  return { valor, unidade };
}

export function massDisplayFromRecord(record, {
  valorKey,
  unidadeKey,
  legacyKey,
  defaultUnit = "g",
}) {
  const { valor, unidade } = resolveMassFields(record, {
    valorKey,
    unidadeKey,
    legacyKey,
    defaultUnit,
  });
  return formatMassDisplay(valor, unidade, { fallback: "" });
}
