/**
 * Converte transcript pt-BR em string numérica para inputs de calibração.
 * Aceita dígitos falados/digitados, vírgula/ponto e "vírgula"/"ponto".
 */

const UNIT_WORDS = new Set([
  "grau", "graus", "celsius", "porcento", "por", "cento",
  "hectopascal", "hectopascais", "hpa", "pascal", "unidade", "unidades",
]);

const ONES = {
  zero: 0,
  um: 1,
  uma: 1,
  dois: 2,
  duas: 2,
  tres: 3,
  três: 3,
  quatro: 4,
  cinco: 5,
  seis: 6,
  sete: 7,
  oito: 8,
  nove: 9,
};

const TEENS = {
  dez: 10,
  onze: 11,
  doze: 12,
  treze: 13,
  quatorze: 14,
  catorze: 14,
  quinze: 15,
  dezesseis: 16,
  dezassete: 17,
  dezessete: 17,
  dezoito: 18,
  dezenove: 19,
};

const TENS = {
  vinte: 20,
  trinta: 30,
  quarenta: 40,
  cinquenta: 50,
  sessenta: 60,
  setenta: 70,
  oitenta: 80,
  noventa: 90,
};

const HUNDREDS = {
  cem: 100,
  cento: 100,
  duzentos: 200,
  duzentas: 200,
  trezentos: 300,
  trezentas: 300,
  quatrocentos: 400,
  quatrocentas: 400,
  quinhentos: 500,
  quinhentas: 500,
  seiscentos: 600,
  seiscentas: 600,
  setecentos: 700,
  setecentas: 700,
  oitocentos: 800,
  oitocentas: 800,
  novecentos: 900,
  novecentas: 900,
};

function normalizeToken(raw) {
  return String(raw || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9,.\-]/g, "");
}

function tokenize(transcript) {
  return String(transcript || "")
    .trim()
    .split(/\s+/)
    .map(normalizeToken)
    .filter(Boolean)
    .filter((t) => !UNIT_WORDS.has(t) && t !== "e" && t !== "de");
}

function wordsToInteger(tokens) {
  if (!tokens.length) return null;
  let total = 0;
  let current = 0;
  let sawNumber = false;

  for (const t of tokens) {
    if (/^\d+$/.test(t)) {
      current += Number(t);
      sawNumber = true;
      continue;
    }
    if (ONES[t] != null) {
      current += ONES[t];
      sawNumber = true;
      continue;
    }
    if (TEENS[t] != null) {
      current += TEENS[t];
      sawNumber = true;
      continue;
    }
    if (TENS[t] != null) {
      current += TENS[t];
      sawNumber = true;
      continue;
    }
    if (HUNDREDS[t] != null) {
      current += HUNDREDS[t];
      sawNumber = true;
      continue;
    }
    if (t === "mil") {
      current = (current || 1) * 1000;
      total += current;
      current = 0;
      sawNumber = true;
      continue;
    }
    return null;
  }

  if (!sawNumber) return null;
  return total + current;
}

/**
 * @param {string} transcript
 * @returns {{ ok: true, value: string, numeric: number } | { ok: false, message: string }}
 */
export function parseSpokenNumber(transcript) {
  const raw = String(transcript || "").trim();
  if (!raw) {
    return { ok: false, message: "Nenhum valor reconhecido." };
  }

  // Preferência: já veio como número (ex.: "20,45" / "20.45" / "-1,2")
  const directMatch = raw.match(/-?\d+(?:[.,]\d+)?/);
  if (directMatch && /^[\s\-−]?\d+[.,]?\d*\s*$/.test(raw.replace(/grau(s)?|celsius|%|hpa|ur/gi, "").trim())) {
    const value = directMatch[0].replace(".", ",");
    const numeric = Number(value.replace(",", "."));
    if (!Number.isFinite(numeric)) {
      return { ok: false, message: "Valor numérico inválido." };
    }
    return { ok: true, value, numeric };
  }

  const tokens = tokenize(raw);
  if (!tokens.length) {
    return { ok: false, message: "Não foi possível interpretar o valor." };
  }

  let negative = false;
  if (tokens[0] === "menos" || tokens[0] === "-") {
    negative = true;
    tokens.shift();
  }

  const sepIdx = tokens.findIndex((t) => t === "virgula" || t === "ponto" || t === "," || t === ".");
  let intTokens;
  let fracTokens = [];
  if (sepIdx >= 0) {
    intTokens = tokens.slice(0, sepIdx);
    fracTokens = tokens.slice(sepIdx + 1);
  } else {
    intTokens = tokens;
  }

  // Parte fracionária em dígitos falados ("quatro cinco" → 45)
  let intPart = wordsToInteger(intTokens);
  if (intPart == null && intTokens.length === 0) intPart = 0;
  if (intPart == null) {
    // fallback: juntar dígitos soltos
    const digitOnly = intTokens.every((t) => ONES[t] != null || /^\d$/.test(t));
    if (digitOnly && intTokens.length) {
      intPart = Number(intTokens.map((t) => (ONES[t] != null ? String(ONES[t]) : t)).join(""));
    } else {
      return { ok: false, message: `Não entendi o número: "${raw}". Fale novamente ou digite.` };
    }
  }

  let fracStr = "";
  if (fracTokens.length) {
    const asDigits = fracTokens.map((t) => {
      if (/^\d+$/.test(t)) return t;
      if (ONES[t] != null) return String(ONES[t]);
      return null;
    });
    if (asDigits.every((d) => d != null)) {
      fracStr = asDigits.join("");
    } else {
      const fracNum = wordsToInteger(fracTokens);
      if (fracNum == null) {
        return { ok: false, message: `Não entendi a parte decimal: "${raw}".` };
      }
      fracStr = String(fracNum);
    }
  }

  let value = String(intPart);
  if (fracStr) value += `,${fracStr}`;
  if (negative) value = `-${value}`;

  const numeric = Number(value.replace(",", "."));
  if (!Number.isFinite(numeric)) {
    return { ok: false, message: "Valor numérico inválido." };
  }
  return { ok: true, value, numeric };
}
