/** Normaliza base numérica (aceita "6.2", "PR-6.2", "RE-6.2A"). */
export function normalizeCodeBase(input) {
  const raw = String(input || "").trim();
  if (!raw) return "";
  const m = raw.match(/(?:PR|RE|MQ)-?(\d+(?:\.\d+)*)/i) || raw.match(/^(\d+(?:\.\d+)*)$/);
  return m ? m[1] : raw.replace(/^(PR|RE|MQ)-/i, "").replace(/[A-Z]+$/i, "");
}
