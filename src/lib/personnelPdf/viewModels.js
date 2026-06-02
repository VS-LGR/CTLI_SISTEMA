import { displayValue, formatDateBr } from "@/lib/quotationRequestDisplay";
import { formatOptionListForPdf } from "@/lib/personnelSnapshots";
import { labelsFromOptionItems } from "@/lib/personnelConstants";
import { COMPETENCY_AUTH_TEXT, MONITORING_AUTH_TEXT_APT, MONITORING_AUTH_TEXT_TRAINING, SUITABILITY_REQUIRES_TRAINING } from "@/lib/personnelDocMeta";

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
    metaRows: [
      ["Cargo", p.title],
      ["Formação Exigência", p.required_education],
      ["Formação Desejável", p.desired_education],
      ["Data de Inclusão", formatDateBr(p.inclusion_date)],
      ["Última Atualização", formatDateBr(p.last_update_date)],
    ],
    sections: [
      { type: "block", title: "1. Atribuições do Cargo", content: "" },
      { type: "block", title: "1.1 Conjunto de Atividades Relacionadas à Função", content: p.function_activities },
      { type: "block", title: "1.2 Autoridades e Responsabilidades Técnicas Atribuídas ao Ocupante do Cargo", content: p.technical_authorities },
      { type: "block", title: "1.3 Autoridades e Responsabilidades Gerenciais Atribuídas ao Ocupante do Cargo", content: p.managerial_authorities },
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
  const pos = record.position_snapshot || {};
  return {
    header: docHeaderFromRecord(record, "ADEQUAÇÃO DE COMPETÊNCIA"),
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
      { type: "block", title: "1.2 Autoridades e Responsabilidades Técnicas Atribuídas ao Ocupante do Cargo", content: record.technical_authorities },
      { type: "block", title: "1.3 Autoridades e Responsabilidades Gerenciais Atribuídas ao Ocupante do Cargo", content: record.managerial_authorities },
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
