import { displayValue, formatDateBr } from "@/lib/quotationRequestDisplay";
import { formatOptionListForPdf } from "@/lib/personnelSnapshots";
import { labelsFromOptionItems, normalizeAuthorityValue } from "@/lib/personnelConstants";
import {
  COMPETENCY_AUTH_TEXT,
  MONITORING_AUTH_TEXT_APT,
  MONITORING_AUTH_TEXT_TRAINING,
  SUITABILITY_REQUIRES_TRAINING,
  PERSONNEL_DOC_DEFAULTS,
} from "@/lib/personnelDocMeta";
import { buildPersonnelSubjectMetaRows } from "./personnelSubjectMeta";
import {
  EXPERIENCE_OPINION_LABELS,
  EXPERIENCE_SCORE_CRITERIA,
  EXPERIENCE_APPROVAL_MIN_AVERAGE,
  formatExperiencePeriodLabel,
  resolveExperiencePeriodEndDate,
  experienceResultLabel,
} from "@/lib/personnelExperienceConstants";
import { PERSONNEL_SELECTION_EDUCATION_LEVELS, SELECTION_APPROVAL_TEXT } from "@/lib/personnelSelectionConstants";

function docHeaderFromRecord(record, defaultTitle) {
  return {
    title: defaultTitle,
    code: record.document_code,
    reference: record.document_reference,
    revision: record.document_revision,
    modelIssueDate: record.document_model_issue_date,
  };
}

function listLabels(items) {
  if (!items) return [];
  if (Array.isArray(items) && items.length && typeof items[0] === "string") return items;
  return labelsFromOptionItems(items);
}

export function buildCompetencyPdfViewModel(position) {
  const p = position;
  return {
    header: docHeaderFromRecord(p, "COMPETÊNCIA DO CARGO"),
    subjectMetaRows: buildPersonnelSubjectMetaRows({
      documentCode: p.document_code || PERSONNEL_DOC_DEFAULTS.competency.code,
      positionTitle: p.title,
    }),
    metaRows: [
      ["Cargo", p.title],
      ["Formação Exigência", p.required_education],
      ["Formação Desejável", p.desired_education],
      ["Data de Inclusão", formatDateBr(p.inclusion_date)],
      ["Última Atualização", formatDateBr(p.last_update_date)],
      ...(p.immediate_supervisor ? [["Supervisor Imediato", p.immediate_supervisor]] : []),
    ],
    sections: [
      { type: "block", title: "1. Atribuições do Cargo", content: "" },
      { type: "block", title: "1.1 Conjunto de Atividades Relacionadas à Função", content: p.function_activities },
      { type: "list", title: "1.2 Autoridades e Responsabilidades Técnicas Atribuídas ao Ocupante do Cargo", items: listLabels(normalizeAuthorityValue(p.technical_authorities)) },
      { type: "list", title: "1.3 Autoridades e Responsabilidades Gerenciais Atribuídas ao Ocupante do Cargo", items: listLabels(normalizeAuthorityValue(p.managerial_authorities)) },
      { type: "list", title: "2. Treinamentos Interno", items: listLabels(p.internal_trainings) },
      { type: "list", title: "3. Conhecimentos Gerais", items: listLabels(p.general_knowledge) },
      { type: "list", title: "4. Conhecimento Técnico", items: listLabels(p.technical_knowledge) },
      { type: "list", title: "5. Habilidade", items: listLabels(p.skills) },
      { type: "list", title: "6. Qualificação", items: listLabels(p.qualification) },
      { type: "list", title: "7. Experiência", items: listLabels(p.experience) },
    ],
    authText: COMPETENCY_AUTH_TEXT,
    approvalName: p.analysis_approval_responsible?.full_name || displayValue(p.analysis_approval_responsible_name),
  };
}

export function buildAdequacyPdfViewModel(record) {
  const emp = record.employee_snapshot || {};
  return {
    header: docHeaderFromRecord(record, "ADEQUAÇÃO DE COMPETÊNCIA"),
    subjectMetaRows: buildPersonnelSubjectMetaRows({
      documentCode: record.document_code,
      occupantName: record.occupant_name,
      positionTitle: record.position_title,
      registrationNumber: record.registration_number,
    }),
    metaRows: [
      ["Ocupante do Cargo", record.occupant_name],
      ["Cargo", record.position_title],
      ["Admissão", formatDateBr(record.admission_date)],
      ["Matrícula", record.registration_number],
      ["Formação Atual", record.current_education],
      ["Supervisor Imediato", record.immediate_supervisor],
      ["Última Atualização", formatDateBr(record.last_update_date)],
    ],
    sections: [
      { type: "block", title: "1. Atribuições do Cargo", content: "" },
      { type: "block", title: "1.1 Conjunto de Atividades Relacionadas à Função", content: record.function_activities },
      { type: "list", title: "1.2 Autoridades e Responsabilidades Técnicas Atribuídas ao Ocupante do Cargo", items: listLabels(normalizeAuthorityValue(record.technical_authorities)) },
      { type: "list", title: "1.3 Autoridades e Responsabilidades Gerenciais Atribuídas ao Ocupante do Cargo", items: listLabels(normalizeAuthorityValue(record.managerial_authorities)) },
      { type: "list", title: "2. Treinamentos Interno", items: listLabels(record.internal_trainings) },
      { type: "list", title: "3. Conhecimentos Gerais", items: listLabels(record.general_knowledge) },
      { type: "list", title: "4. Conhecimento Técnico", items: listLabels(record.technical_knowledge) },
      { type: "list", title: "5. Habilidade", items: listLabels(record.skills) },
      { type: "list", title: "6. Qualificação", items: listLabels(record.qualification) },
      { type: "list", title: "7. Experiência", items: listLabels(record.experience) },
    ],
    authText: "ESTA ADEQUAÇÃO DE COMPETÊNCIA FOI ANALISADA PELO SUPERIOR DO FUNCIONÁRIO MENCIONADO ACIMA E ESTE CONCLUÍU QUE O MESMO SE ENCONTRA APTO, SENDO ASSIM ESTÁ AUTORIZADO A EXERCER O CARGO COM SUAS ATRIBUIÇÕES TÉCNICAS E GERENCIAIS DEFINIDAS NESTE DOCUMENTO.",
    approvalName: record.analysis_approval_responsible_name,
    occupantName: record.occupant_name,
    approvalSignatureUrl: null,
    occupantSignatureUrl: emp.signature_url || null,
  };
}

export function buildMonitoringPdfViewModel(record) {
  const emp = record.employee_snapshot || {};
  const needsTraining = record.employee_remains_suitable === SUITABILITY_REQUIRES_TRAINING;
  return {
    header: docHeaderFromRecord(record, "MONITORAMENTO DE PESSOAL"),
    subjectMetaRows: buildPersonnelSubjectMetaRows({
      documentCode: record.document_code,
      occupantName: record.occupant_name,
      positionTitle: record.position_title,
      registrationNumber: record.registration_number,
    }),
    metaRows: [
      ["Ocupante do Cargo", record.occupant_name],
      ["Cargo", record.position_title],
      ["Admissão", formatDateBr(record.admission_date)],
      ["Matrícula", record.registration_number],
      ["Formação Atual", record.current_education],
      ["Supervisor Imediato", record.immediate_supervisor],
      ["Motivo do Monitoramento", record.monitoring_reason],
    ],
    supervisionRows: [
      ["Autorização de Ocupação do Cargo em", formatDateBr(record.occupation_authorization_date)],
      ["Período de Supervisão", record.supervision_period],
      ["Métodos de Monitoramento", formatOptionListForPdf(record.monitoring_methods)],
      ["Data do Último Interlaboratorial", formatDateBr(record.last_interlaboratory_date)],
      ["Data do Último Intralaboratorial", formatDateBr(record.last_intralaboratory_date)],
      ["Órgão Responsável", record.responsible_organization],
      ["Relatório Número", record.report_number],
    ],
    competencyRows: [
      ["Treinamentos Interno", formatOptionListForPdf(record.internal_trainings)],
      ["Conhecimentos Gerais", formatOptionListForPdf(record.general_knowledge)],
      ["Conhecimento Técnico", formatOptionListForPdf(record.technical_knowledge)],
      ["Habilidade", formatOptionListForPdf(record.skills)],
      ["Qualificação", formatOptionListForPdf(record.qualification)],
    ],
    trainingRows: [
      ["Houve Necessidade de Novos Treinamentos?", record.needed_new_training],
      ["Classificação", record.training_classification],
      ["Treinamento em", formatOptionListForPdf(record.training_topics)],
    ],
    nextRows: [
      ["Área Técnica a cada Interlaboratorial ou Intralaboratorial / Área Administrativa Anualmente / Ou quando houver necessidade", ""],
      ["Última Atualização", formatDateBr(record.last_update_date)],
      ["Próximo Monitoramento", formatDateBr(record.next_monitoring_date)],
    ],
    authText: needsTraining ? MONITORING_AUTH_TEXT_TRAINING : MONITORING_AUTH_TEXT_APT,
    suitability: record.employee_remains_suitable,
    approvalName: record.analysis_approval_responsible_name,
    occupantName: record.occupant_name,
    occupantSignatureUrl: emp.signature_url || null,
  };
}

export function buildExperienceEvaluationPdfViewModel(record) {
  const items = record.items || [];
  const periodEndDate = resolveExperiencePeriodEndDate(record.admission_date, record.period_end_date);
  return {
    header: docHeaderFromRecord(record, "AVALIAÇÃO DO PERÍODO DE EXPERIÊNCIA"),
    subjectMetaRows: buildPersonnelSubjectMetaRows({
      documentCode: record.document_code,
      occupantName: record.occupant_name,
      positionTitle: record.position_title,
      registrationNumber: record.registration_number,
    }),
    identityRows: [
      ["Nome", record.occupant_name],
      ["Admissão", formatDateBr(record.admission_date)],
      ["Cargo", record.position_title],
      ["Setor", record.department],
      ["Período de experiência", formatExperiencePeriodLabel(record.admission_date)],
      ["Data final do período de experiência", formatDateBr(periodEndDate)],
    ],
    evaluationItems: items,
    scoreCriteria: EXPERIENCE_SCORE_CRITERIA,
    averageScore: record.average_score != null ? String(record.average_score) : "—",
    periodEndDate: formatDateBr(periodEndDate),
    approvalCriterion: `Média mínima para aprovação: ${EXPERIENCE_APPROVAL_MIN_AVERAGE},0`,
    resultLabel: experienceResultLabel(record.conclusive_opinion) || "—",
    conclusiveOpinionLabel: EXPERIENCE_OPINION_LABELS[record.conclusive_opinion] || record.conclusive_opinion,
    evaluatorName: record.evaluator_name,
    signatureDate: formatDateBr(record.signature_date),
  };
}

export function buildSelectionPdfViewModel(record) {
  const attr = record.selected_position_attributions || {};
  const eduChecked = new Set(labelsFromOptionItems(record.selected_education_levels));
  return {
    header: docHeaderFromRecord(record, "SELEÇÃO DE PESSOAL"),
    subjectMetaRows: buildPersonnelSubjectMetaRows({
      documentCode: record.document_code,
      candidateName: record.candidate_name,
      positionTitle: record.position_title || record.vacancy,
    }),
    page1Rows: [
      ["Data", formatDateBr(record.selection_date)],
      ["Vaga", record.vacancy],
      ["Nível de Formação Exigido", record.required_education_level],
      ["Condutor do Processo Seletivo", record.selection_conductor_name],
      ["Candidato", record.candidate_name],
    ],
    educationChecklist: PERSONNEL_SELECTION_EDUCATION_LEVELS.map((label) => ({
      label,
      checked: eduChecked.has(label) || label === record.required_education_level,
    })),
    attributions: {
      showActivities: !!attr.function_activities,
      showTechnical: !!attr.technical_authorities,
      showManagerial: !!attr.managerial_authorities,
      functionActivities: record.function_activities,
      technicalAuthorities: listLabels(normalizeAuthorityValue(record.technical_authorities)),
      managerialAuthorities: listLabels(normalizeAuthorityValue(record.managerial_authorities)),
    },
    generalKnowledge: listLabels(record.selected_general_knowledge),
    technicalKnowledge: [
      ...listLabels(record.selected_technical_knowledge),
      ...(record.technical_knowledge_other ? [`Outros: ${record.technical_knowledge_other}`] : []),
    ],
    skills: listLabels(record.selected_skills),
    qualifications: [
      ...listLabels(record.selected_qualifications),
      ...(record.qualification_other ? [`Outros: ${record.qualification_other}`] : []),
    ],
    experience: listLabels(record.selected_experience),
    approved: record.conclusive_opinion_approved === true,
    opinionText: record.conclusive_opinion_approved === true
      ? SELECTION_APPROVAL_TEXT
      : record.conclusive_opinion_text,
    approvalName: record.analysis_approval_responsible_name,
  };
}

export function buildAttendanceListPdfViewModel(record) {
  const participants = record.participants || [];
  return {
    header: docHeaderFromRecord(record, "LISTA DE PRESENÇA"),
    subjectMetaRows: buildPersonnelSubjectMetaRows({
      documentCode: record.document_code,
    }),
    courseRows: [
      ["Curso", record.course_title],
      ["Horário", record.schedule],
      ["Entidade Executora", record.executing_entity],
      ["Data", formatDateBr(record.course_date)],
      ["Duração", record.duration_hours],
      ["Instrutor(es)", record.instructors],
    ],
    participants: participants.map((p) => [
      String(p.order_number || ""),
      p.full_name,
      p.department,
      p.signature_status,
      p.frequency_percentage != null ? `${p.frequency_percentage}%` : "",
      p.result,
    ]),
    contentSummary: record.content_summary,
    observations: record.observations,
    movementRows: [
      ["Nº de concluintes", record.concludes_count],
      ["% de frequência", record.attendance_percentage != null ? `${record.attendance_percentage}%` : ""],
      ["Aprovados", record.approved_count],
      ["Reprovados", record.reproved_count],
      ["Instrutor responsável", record.instructor_responsible],
    ],
    courseTitle: record.course_title,
  };
}
