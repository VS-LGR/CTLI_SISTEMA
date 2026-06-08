import { getPersonnelTopicById } from "@/lib/personnelRegistrosConfig";
import { EXPERIENCE_OPINION_REJECTED } from "@/lib/personnelExperienceConstants";
import { SUITABILITY_REQUIRES_TRAINING } from "@/lib/personnelDocMeta";

function norm(s) {
  return String(s ?? "").trim().toLowerCase();
}

function rowHaystack(row, topic) {
  const parts = (topic.searchFields || []).map((f) => row?.[f]);
  if (topic.nestedSearch) parts.push(topic.nestedSearch(row));
  if (topic.code) parts.push(topic.code);
  return parts.map(norm).join(" ");
}

function rowDate(row, dateField) {
  const v = row?.[dateField];
  return v ? String(v).slice(0, 10) : "";
}

export const EMPTY_PERSONNEL_REGISTROS_FILTERS = { query: "", topic: "all", date: "" };

/**
 * Filtra linhas de um tópico específico (uso nos list panels).
 * @param {Array<Record<string, unknown>>} rows
 * @param {{ query?: string, date?: string }} externalFilters
 * @param {string} topicId
 */
export function filterPersonnelTopicRows(rows, externalFilters, topicId) {
  const topic = getPersonnelTopicById(topicId);
  if (!topic) return rows || [];
  const q = norm(externalFilters?.query);
  const d = String(externalFilters?.date ?? "").trim();
  if (!q && !d) return rows || [];

  return (rows || []).filter((row) => {
    if (q && !rowHaystack(row, topic).includes(q)) return false;
    if (d && rowDate(row, topic.dateField) !== d) return false;
    return true;
  });
}

export function hasActivePersonnelRegistrosFilters(filters) {
  return Boolean(
    filters?.query?.trim()
    || (filters?.topic && filters.topic !== "all")
    || filters?.date?.trim(),
  );
}

/**
 * Métricas por tópico (respeita linhas já filtradas pelo painel).
 * @param {string} topicId
 * @param {Array<Record<string, unknown>>} rows
 */
export function computePersonnelTopicStats(topicId, rows) {
  const list = rows || [];
  const total = list.length;

  switch (topicId) {
    case "re-62c": {
      const activePositions = list.filter((r) => r.status === "ativo").length;
      const obsoletePositions = list.filter((r) => r.status === "inativo").length;
      return { total, activePositions, obsoletePositions, attention: obsoletePositions };
    }
    case "re-62a": {
      const draftAdequacies = list.filter((r) => r.adequacy_status === "rascunho").length;
      return { total, draftAdequacies, attention: draftAdequacies };
    }
    case "re-62e": {
      const needsTraining = list.filter((r) => r.employee_remains_suitable === SUITABILITY_REQUIRES_TRAINING).length;
      return { total, needsTraining, attention: needsTraining };
    }
    case "re-62b": {
      const rejectedExperience = list.filter((r) => r.conclusive_opinion === EXPERIENCE_OPINION_REJECTED).length;
      return { total, rejectedExperience, attention: rejectedExperience };
    }
    case "pr-62f": {
      const rejectedSelections = list.filter((r) => r.conclusive_opinion_approved === false).length;
      return { total, rejectedSelections, attention: rejectedSelections };
    }
    default:
      return { total, attention: 0 };
  }
}

function topicStatsEqual(a, b) {
  if (!a || !b) return a === b;
  return (
    a.total === b.total
    && a.attention === b.attention
    && a.activePositions === b.activePositions
    && a.obsoletePositions === b.obsoletePositions
    && a.draftAdequacies === b.draftAdequacies
    && a.needsTraining === b.needsTraining
    && a.rejectedExperience === b.rejectedExperience
    && a.rejectedSelections === b.rejectedSelections
  );
}

/**
 * Agrega métricas dos painéis visíveis para os cartões do dashboard.
 * @param {Record<string, ReturnType<typeof computePersonnelTopicStats>>} topicStatsMap
 */
export function aggregatePersonnelKpis(topicStatsMap) {
  const stats = Object.values(topicStatsMap || {});
  const total = stats.reduce((n, s) => n + (s.total || 0), 0);
  const activePositions = stats.reduce((n, s) => n + (s.activePositions || 0), 0);
  const attention = stats.reduce((n, s) => n + (s.attention || 0), 0);
  return { total, activePositions, attention };
}

export { topicStatsEqual };
