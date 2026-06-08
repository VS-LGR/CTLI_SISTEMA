export const EXPERIENCE_EVALUATION_SCORES = [0, 2, 4, 6, 8, 10];

export const EXPERIENCE_EVALUATION_ITEMS = [
  { item_number: 1, description: "Assiduidade — que comparece com regularidade" },
  { item_number: 2, description: "Pontualidade — que chega na hora marcada" },
  { item_number: 3, description: "Iniciativa — ação de ser o primeiro a propor" },
  { item_number: 4, description: "Competência — capacidade, aptidão" },
  { item_number: 5, description: "Disciplina — ordem que convém ao bom funcionário" },
  { item_number: 6, description: "Segurança no trabalho — relacionado a atos inseguros" },
  { item_number: 7, description: "Nível de assimilação dos procedimentos aplicáveis à sua função" },
  { item_number: 8, description: "Apresentação Pessoal — Uso do uniforme" },
  { item_number: 9, description: "Conhece e pratica a política da qualidade" },
  { item_number: 10, description: "Zelo com patrimônio" },
];

export const EXPERIENCE_SCORE_CRITERIA = [
  { score: 0, label: "Péssimo" },
  { score: 2, label: "Ruim" },
  { score: 4, label: "Razoável" },
  { score: 6, label: "Bom" },
  { score: 8, label: "Ótimo" },
  { score: 10, label: "Excelente" },
];

export const EXPERIENCE_CRITERION_LOW =
  "Não é recomendada a aprovação do funcionário, pois ele não atende aos requisitos básicos da empresa.";

export const EXPERIENCE_CRITERION_POSITIVE =
  "É recomendada a aprovação do funcionário, pois ele atende aos requisitos básicos da empresa.";

export const EXPERIENCE_PERIOD_MAX_MONTHS = 3;
export const EXPERIENCE_APPROVAL_MIN_AVERAGE = 6;

export const EXPERIENCE_OPINION_APPROVED = "aprovado";
export const EXPERIENCE_OPINION_REJECTED = "reprovado";

export const EXPERIENCE_OPINION_LABELS = {
  aprovado: "Aprovado por tempo indeterminado",
  reprovado: "Reprovado, devendo ser encerrado seu contrato",
};

export function defaultExperienceEvaluationItems() {
  return EXPERIENCE_EVALUATION_ITEMS.map((it) => ({
    item_number: it.item_number,
    description: it.description,
    score: null,
  }));
}

export function calculateExperienceAverage(items) {
  const scores = (items || []).map((i) => i.score).filter((s) => s !== null && s !== undefined && s !== "");
  if (!scores.length) return null;
  const sum = scores.reduce((a, b) => a + Number(b), 0);
  return Math.round((sum / scores.length) * 100) / 100;
}

export function suggestExperienceOpinion(average) {
  if (average === null || average === undefined) return "";
  return average >= EXPERIENCE_APPROVAL_MIN_AVERAGE ? EXPERIENCE_OPINION_APPROVED : EXPERIENCE_OPINION_REJECTED;
}

function formatIsoDateBr(iso) {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

export function computeExperiencePeriodEnd(admissionDate) {
  if (!admissionDate) return null;
  const d = new Date(`${admissionDate.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  d.setMonth(d.getMonth() + EXPERIENCE_PERIOD_MAX_MONTHS);
  return d.toISOString().slice(0, 10);
}

export function formatExperiencePeriodLabel(admissionDate) {
  if (!admissionDate) return "—";
  const end = computeExperiencePeriodEnd(admissionDate);
  return `${formatIsoDateBr(admissionDate)} a ${formatIsoDateBr(end)} (máximo ${EXPERIENCE_PERIOD_MAX_MONTHS} meses)`;
}

export function experienceResultLabel(opinion) {
  if (opinion === EXPERIENCE_OPINION_APPROVED) return "APROVADO";
  if (opinion === EXPERIENCE_OPINION_REJECTED) return "REPROVADO";
  return "";
}
