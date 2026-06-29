/**
 * Valores nominais convencionais OIML R 111-1 (série 1-2-5).
 * Referência para cadastro de pesos padrão — V.V.C. continua vindo do certificado.
 */

const OIML_R111_NOMINAL_SERIES = [1, 2, 5];

function buildNominalSeries(maxExponent, unitScale) {
  const values = [];
  for (let exp = unitScale; exp <= maxExponent; exp += 1) {
    for (const base of OIML_R111_NOMINAL_SERIES) {
      const v = base * 10 ** exp;
      values.push(v);
    }
  }
  return [...new Set(values)].sort((a, b) => a - b);
}

/** mg: 1 mg … 500 mg */
export const OIML_R111_NOMINALS_MG = buildNominalSeries(2, 0);

/** g: 1 g … 500 g */
export const OIML_R111_NOMINALS_G = buildNominalSeries(2, 0);

/** kg: 1 kg … 5000 kg */
export const OIML_R111_NOMINALS_KG = buildNominalSeries(3, 0);

const BY_UNIT = {
  mg: OIML_R111_NOMINALS_MG,
  g: OIML_R111_NOMINALS_G,
  kg: OIML_R111_NOMINALS_KG,
};

export function oimlNominalsForUnit(unit = "g") {
  const u = String(unit || "g").trim().toLowerCase();
  return BY_UNIT[u] || OIML_R111_NOMINALS_G;
}

export function oimlNominalOptionsForUnit(unit = "g") {
  return oimlNominalsForUnit(unit).map((v) => String(v).replace(".", ","));
}

function parseNominalInput(raw) {
  const s = String(raw ?? "").trim().replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Validação soft: valor está na série OIML para a unidade. */
export function isOimlNominalValue(raw, unit = "g") {
  const n = parseNominalInput(raw);
  if (n == null) return true;
  return oimlNominalsForUnit(unit).some((v) => Math.abs(v - n) < 1e-9);
}

/** Sugestão quando o valor informado não está na série OIML. */
export function oimlNominalHint(raw, unit = "g") {
  const n = parseNominalInput(raw);
  if (n == null || isOimlNominalValue(raw, unit)) return null;
  const options = oimlNominalsForUnit(unit);
  const nearest = options.reduce((best, v) => (
    Math.abs(v - n) < Math.abs(best - n) ? v : best
  ), options[0]);
  return `Valor fora da série OIML R 111-1. Próximo nominal oficial: ${String(nearest).replace(".", ",")} ${unit}`;
}
