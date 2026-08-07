/** Normalização e matching fuzzy para voz (pt-BR). */

import { parseSpokenNumber } from "@/lib/voice/parseSpokenNumber";

export function normalizeSpokenQuery(raw) {
  return String(raw || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s.,/\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseSpokenText(transcript) {
  const raw = String(transcript || "").trim();
  if (!raw) return { ok: false, message: "Nenhum texto reconhecido." };
  return { ok: true, value: raw.replace(/\s+/g, " ").trim() };
}

/**
 * @param {string} transcript
 * @param {Array<{ value: string, label: string, aliases?: string[] }>} options
 */
export function parseSpokenChoice(transcript, options = []) {
  const q = normalizeSpokenQuery(transcript);
  if (!q) return { ok: false, message: "Nenhuma opção reconhecida." };

  const scored = options.map((opt) => {
    const label = normalizeSpokenQuery(opt.label);
    const value = normalizeSpokenQuery(opt.value);
    const aliases = (opt.aliases || []).map(normalizeSpokenQuery);
    let score = 0;
    if (q === value || q === label) score = 100;
    else if (aliases.includes(q)) score = 95;
    else if (label.startsWith(q) || value.startsWith(q)) score = 80;
    else if (label.includes(q) || value.includes(q)) score = 60;
    else {
      const qTokens = q.split(" ").filter(Boolean);
      const hay = `${label} ${value} ${aliases.join(" ")}`;
      const hit = qTokens.filter((t) => hay.includes(t)).length;
      if (hit) score = Math.round((hit / qTokens.length) * 50);
    }
    return { opt, score };
  }).filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  if (!scored.length) {
    return { ok: false, message: `Não encontrei a opção: "${transcript}".` };
  }

  const best = scored[0];
  const ambiguous = scored.length > 1 && scored[1].score >= best.score - 5;
  return {
    ok: true,
    value: best.opt.value,
    label: best.opt.label,
    matches: scored.slice(0, 5).map((s) => ({
      id: s.opt.value,
      value: s.opt.value,
      label: s.opt.label,
      score: s.score,
      record: s.opt,
    })),
    ambiguous,
  };
}

/**
 * @param {string} transcript
 * @param {object[]} records
 * @param {(r: object) => string} getLabel
 * @param {{ getSearchText?: (r: object) => string, limit?: number }} [opts]
 */
export function matchSpokenLookup(transcript, records = [], getLabel, opts = {}) {
  const q = normalizeSpokenQuery(transcript);
  if (!q) return { ok: false, message: "Nenhum termo para pesquisar.", matches: [] };

  const getSearchText = opts.getSearchText || getLabel;
  const limit = opts.limit ?? 5;

  const scored = (records || []).map((record) => {
    const label = String(getLabel?.(record) || "").trim();
    const search = normalizeSpokenQuery(getSearchText?.(record) || label);
    let score = 0;
    if (!search) return { record, label, score: 0 };
    if (search === q) score = 100;
    else if (search.startsWith(q)) score = 85;
    else if (search.includes(q)) score = 70;
    else {
      const qTokens = q.split(" ").filter((t) => t.length > 1);
      if (!qTokens.length) score = 0;
      else {
        const hit = qTokens.filter((t) => search.includes(t)).length;
        score = Math.round((hit / qTokens.length) * 55);
      }
    }
    return { record, label, score };
  }).filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  if (!scored.length) {
    return {
      ok: false,
      message: `Nenhum registo encontrado para "${transcript}".`,
      matches: [],
    };
  }

  const matches = scored.map((s, i) => ({
    id: s.record?.id || String(i),
    value: s.record?.id || s.label,
    label: s.label,
    score: s.score,
    record: s.record,
  }));

  return {
    ok: true,
    value: matches[0].value,
    label: matches[0].label,
    record: matches[0].record,
    matches,
    ambiguous: matches.length > 1 && matches[1].score >= matches[0].score - 10,
  };
}

export const YES_NO_OPTIONS = [
  { value: "sim", label: "Sim", aliases: ["yes", "afirmativo"] },
  { value: "nao", label: "Não", aliases: ["no", "negativo"] },
];

export const NOMINAL_UNIT_OPTIONS = [
  { value: "mg", label: "mg", aliases: ["miligrama", "miligramas"] },
  { value: "g", label: "g", aliases: ["grama", "gramas"] },
  { value: "kg", label: "kg", aliases: ["quilograma", "quilo", "quilos"] },
];

/** Interpreta valor falado conforme o tipo do campo. */
export function interpretSpokenField(kind, transcript, {
  options = [],
  records = [],
  getLabel,
  getSearchText,
} = {}) {
  if (kind === "number") {
    return { kind, ...parseSpokenNumber(transcript) };
  }
  if (kind === "choice") {
    return { kind, ...parseSpokenChoice(transcript, options) };
  }
  if (kind === "lookup") {
    return {
      kind,
      ...matchSpokenLookup(transcript, records, getLabel, { getSearchText }),
    };
  }
  return { kind: "text", ...parseSpokenText(transcript) };
}
