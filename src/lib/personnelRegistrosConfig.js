import { PERSONNEL_DOC_DEFAULTS } from "@/lib/personnelDocMeta";

const D = PERSONNEL_DOC_DEFAULTS;

export const PERSONNEL_REGISTRO_TOPICS = [
  {
    id: "re-62c",
    code: D.competency.code,
    label: `${D.competency.code} — Competência do cargo`,
    shortLabel: "Competência do cargo",
    nbrRef: "6.2 a — Requisitos de competência por função",
    dateField: "last_update_date",
    searchFields: ["title", "required_education", "desired_education", "immediate_supervisor", "status"],
    nestedSearch: (row) => row.analysis_approval_responsible?.full_name,
  },
  {
    id: "re-62a",
    code: D.adequacy.code,
    label: `${D.adequacy.code} — Adequação de competência`,
    shortLabel: "Adequação de competência",
    nbrRef: "6.2 c — Registros de competência e autorização",
    dateField: "last_update_date",
    searchFields: [
      "registration_number",
      "occupant_name",
      "position_title",
      "immediate_supervisor",
      "analysis_approval_responsible_name",
      "adequacy_status",
    ],
  },
  {
    id: "re-62e",
    code: D.monitoring.code,
    label: `${D.monitoring.code} — Monitoramento de pessoal`,
    shortLabel: "Monitoramento de pessoal",
    nbrRef: "6.2 d/e — Supervisão e manutenção da competência",
    dateField: "last_update_date",
    searchFields: [
      "registration_number",
      "occupant_name",
      "position_title",
      "monitoring_reason",
      "immediate_supervisor",
      "analysis_approval_responsible_name",
      "employee_remains_suitable",
    ],
  },
  {
    id: "re-62b",
    code: D.experienceEvaluation.code,
    label: `${D.experienceEvaluation.code} — Avaliação do período de experiência`,
    shortLabel: "Avaliação de experiência",
    nbrRef: "6.2 b — Supervisão de pessoal em período inicial",
    dateField: "evaluation_date",
    searchFields: ["occupant_name", "position_title", "evaluator_name", "department", "registration_number"],
  },
  {
    id: "pr-62f",
    code: D.personnelSelection.code,
    label: `${D.personnelSelection.code} — Seleção de pessoal`,
    shortLabel: "Seleção de pessoal",
    nbrRef: "6.2 b — Seleção de pessoal",
    dateField: "selection_date",
    searchFields: [
      "candidate_name",
      "vacancy",
      "position_title",
      "selection_conductor_name",
      "analysis_approval_responsible_name",
    ],
  },
  {
    id: "re-62d",
    code: D.attendanceList.code,
    label: `${D.attendanceList.code} — Lista de presença`,
    shortLabel: "Lista de presença",
    nbrRef: "6.2 b/c — Registros de treinamento",
    dateField: "course_date",
    searchFields: ["course_title", "instructors", "department", "general_movement"],
  },
];

export const PERSONNEL_REGISTRO_GROUPS = [
  {
    id: "cargos-competencia",
    label: "Cargos e Competência",
    topicIds: ["re-62c", "re-62a"],
  },
  {
    id: "acompanhamento",
    label: "Acompanhamento do Pessoal",
    topicIds: ["re-62e", "re-62b"],
  },
  {
    id: "selecao-capacitacao",
    label: "Seleção e Capacitação",
    topicIds: ["pr-62f", "re-62d"],
  },
];

export function getPersonnelTopicById(topicId) {
  return PERSONNEL_REGISTRO_TOPICS.find((t) => t.id === topicId);
}

export function getVisibleGroupsAndTopics(activeTopic) {
  const topic = activeTopic && activeTopic !== "all" ? activeTopic : null;
  return PERSONNEL_REGISTRO_GROUPS.map((group) => ({
    ...group,
    topics: group.topicIds
      .map((id) => getPersonnelTopicById(id))
      .filter(Boolean)
      .filter((t) => !topic || t.id === topic),
  })).filter((g) => g.topics.length > 0);
}
