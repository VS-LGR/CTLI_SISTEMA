import { getPersonnelTopicById } from "@/lib/personnelRegistrosConfig";
import {
  EXPERIENCE_OPINION_APPROVED,
  EXPERIENCE_OPINION_REJECTED,
} from "@/lib/personnelExperienceConstants";
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

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function isOverdueMonitoringDate(dateValue) {
  if (!dateValue) return false;
  return String(dateValue).slice(0, 10) < todayIso();
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
      const completedAdequacies = list.filter((r) => r.adequacy_status === "concluida").length;
      const draftAdequacies = list.filter((r) => r.adequacy_status === "rascunho").length;
      return { total, completedAdequacies, draftAdequacies, attention: draftAdequacies };
    }
    case "re-62e": {
      const overdueMonitorings = list.filter((r) => isOverdueMonitoringDate(r.next_monitoring_date)).length;
      const needsTraining = list.filter((r) => r.employee_remains_suitable === SUITABILITY_REQUIRES_TRAINING).length;
      return { total, overdueMonitorings, needsTraining, attention: overdueMonitorings + needsTraining };
    }
    case "re-62b": {
      const approvedExperience = list.filter((r) => r.conclusive_opinion === EXPERIENCE_OPINION_APPROVED).length;
      const rejectedExperience = list.filter((r) => r.conclusive_opinion === EXPERIENCE_OPINION_REJECTED).length;
      const pendingOpinion = list.filter((r) => !r.conclusive_opinion).length;
      return {
        total,
        approvedExperience,
        rejectedExperience,
        pendingOpinion,
        attention: rejectedExperience + pendingOpinion,
      };
    }
    case "pr-62f": {
      const approvedSelections = list.filter((r) => r.conclusive_opinion_approved === true).length;
      const rejectedSelections = list.filter((r) => r.conclusive_opinion_approved === false).length;
      const pendingSelections = list.filter((r) => r.conclusive_opinion_approved === null || r.conclusive_opinion_approved === undefined).length;
      return {
        total,
        approvedSelections,
        rejectedSelections,
        pendingSelections,
        attention: rejectedSelections + pendingSelections,
      };
    }
    case "re-62d": {
      const totalParticipantsApproved = list.reduce((n, r) => n + (Number(r.approved_count) || 0), 0);
      const totalParticipantsReproved = list.reduce((n, r) => n + (Number(r.reproved_count) || 0), 0);
      return {
        total,
        totalParticipantsApproved,
        totalParticipantsReproved,
        attention: totalParticipantsReproved,
      };
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
    && a.completedAdequacies === b.completedAdequacies
    && a.draftAdequacies === b.draftAdequacies
    && a.overdueMonitorings === b.overdueMonitorings
    && a.needsTraining === b.needsTraining
    && a.approvedExperience === b.approvedExperience
    && a.rejectedExperience === b.rejectedExperience
    && a.pendingOpinion === b.pendingOpinion
    && a.approvedSelections === b.approvedSelections
    && a.rejectedSelections === b.rejectedSelections
    && a.pendingSelections === b.pendingSelections
    && a.totalParticipantsApproved === b.totalParticipantsApproved
    && a.totalParticipantsReproved === b.totalParticipantsReproved
  );
}

/**
 * Soma totais de registros dos tópicos visíveis.
 * @param {Record<string, ReturnType<typeof computePersonnelTopicStats>>} topicStatsMap
 */
export function sumPersonnelTopicTotals(topicStatsMap) {
  return Object.values(topicStatsMap || {}).reduce((n, s) => n + (s?.total || 0), 0);
}

/**
 * Monta indicadores de conformidade por grupo NBR a partir das stats dos painéis + gaps cruzados.
 * @param {Record<string, ReturnType<typeof computePersonnelTopicStats>>} topicStats
 * @param {{ withoutCompletedAdequacy?: number, overdueMonitoring?: number, pendingExperience?: number } | null} compliance
 */
export function buildPersonnelGroupCompliance(topicStats, compliance = null) {
  const s = (id) => topicStats[id] || {};

  const cargos = s("re-62c");
  const adequacy = s("re-62a");
  const monitoring = s("re-62e");
  const experience = s("re-62b");
  const selection = s("pr-62f");
  const attendance = s("re-62d");

  const withoutAdequacy = compliance?.withoutCompletedAdequacy ?? 0;
  const overdueCross = compliance?.overdueMonitoring ?? 0;
  const pendingExpCross = compliance?.pendingExperience ?? 0;

  return {
    "cargos-competencia": {
      metric1: { label: "Cargos ativos", value: cargos.activePositions ?? 0 },
      metric2: { label: "Adequações concluídas", value: adequacy.completedAdequacies ?? 0 },
      attention: [
        (adequacy.draftAdequacies ?? 0) > 0 && `${adequacy.draftAdequacies} rascunho(s) de adequação`,
        withoutAdequacy > 0 && `${withoutAdequacy} colaborador(es) sem adequação concluída`,
        (cargos.obsoletePositions ?? 0) > 0 && `${cargos.obsoletePositions} cargo(s) obsoleto(s)`,
      ].filter(Boolean),
    },
    acompanhamento: {
      metric1: { label: "Monitoramentos vencidos", value: overdueCross },
      metric2: { label: "Treinamento complementar", value: monitoring.needsTraining ?? 0 },
      attention: [
        overdueCross > 0 && `${overdueCross} colaborador(es) com monitoramento vencido`,
        (experience.rejectedExperience ?? 0) > 0 && `${experience.rejectedExperience} experiência(s) reprovada(s)`,
        pendingExpCross > 0 && `${pendingExpCross} experiência(s) pendente(s)`,
        (experience.pendingOpinion ?? 0) > 0 && `${experience.pendingOpinion} avaliação(ões) sem parecer`,
      ].filter(Boolean),
    },
    "selecao-capacitacao": {
      metric1: { label: "Seleções aprovadas", value: selection.approvedSelections ?? 0 },
      metric2: { label: "Capacitações realizadas", value: attendance.total ?? 0 },
      attention: [
        (attendance.totalParticipantsApproved ?? 0) > 0 && `${attendance.totalParticipantsApproved} participante(s) aprovado(s) em treinamentos`,
        (selection.rejectedSelections ?? 0) > 0 && `${selection.rejectedSelections} seleção(ões) reprovada(s)`,
        (attendance.totalParticipantsReproved ?? 0) > 0 && `${attendance.totalParticipantsReproved} participante(s) reprovado(s)`,
      ].filter(Boolean),
    },
  };
}

/**
 * Soma itens de atenção dos grupos + gaps cruzados para resumo geral.
 */
export function sumPersonnelAttentionSummary(topicStats, compliance = null) {
  const groups = buildPersonnelGroupCompliance(topicStats, compliance);
  const groupAttention = Object.values(groups).reduce((n, g) => n + g.attention.length, 0);
  const recordAttention = Object.values(topicStats || {}).reduce((n, s) => n + (s?.attention || 0), 0);
  return Math.max(groupAttention, recordAttention);
}

export { topicStatsEqual };
