import { NOT_APPLICABLE_LABEL } from "@/lib/personnelConstants";
import { labelsFromOptionItems } from "@/lib/personnelConstants";

function hasTrainings(items) {
  const labels = labelsFromOptionItems(items);
  if (!labels.length) return false;
  if (labels.length === 1 && labels[0] === NOT_APPLICABLE_LABEL) return true;
  return labels.some((l) => l && l !== NOT_APPLICABLE_LABEL);
}

export function validatePosition(payload) {
  const errors = [];
  if (!payload.title?.trim()) errors.push("Cargo é obrigatório.");
  if (!payload.required_education?.trim()) errors.push("Formação exigida é obrigatória.");
  if (!payload.function_activities?.trim()) errors.push("Conjunto de atividades relacionadas à função é obrigatório.");
  if (!hasTrainings(payload.internal_trainings)) {
    errors.push("Informe treinamentos internos ou selecione Não Aplicável.");
  }
  const respId = payload.analysis_approval_responsible_id;
  const respNa = payload.analysis_approval_responsible_na;
  if (!respNa && !respId) {
    errors.push("Responsável pela análise e aprovação é obrigatório (ou marque Não Aplicável).");
  }
  return errors;
}

export function validateAdequacy(payload) {
  const errors = [];
  if (!payload.employee_id) errors.push("Colaborador é obrigatório.");
  if (!payload.position_id) errors.push("Cargo é obrigatório.");
  if (!payload.registration_number?.trim()) errors.push("Matrícula é obrigatória.");
  if (!payload.admission_date) errors.push("Data de admissão é obrigatória.");
  if (!payload.current_education?.trim()) errors.push("Formação atual é obrigatória.");
  if (!payload.last_update_date) errors.push("Última atualização é obrigatória.");
  if (!payload.analysis_approval_responsible_na && !payload.analysis_approval_responsible_id && !payload.analysis_approval_responsible_name?.trim()) {
    errors.push("Responsável pela análise e aprovação é obrigatório.");
  }
  return errors;
}

export function validateMonitoring(payload) {
  const errors = [];
  if (!payload.employee_id) errors.push("Colaborador é obrigatório.");
  if (!payload.position_id) errors.push("Cargo é obrigatório.");
  if (!payload.monitoring_reason?.trim()) errors.push("Motivo é obrigatório.");
  const methods = labelsFromOptionItems(payload.monitoring_methods);
  if (!methods.length) errors.push("Método de monitoramento é obrigatório.");
  if (!payload.last_update_date) errors.push("Última atualização é obrigatória.");
  if (!payload.next_monitoring_date) errors.push("Próximo monitoramento é obrigatório.");
  if (!payload.employee_remains_suitable?.trim()) errors.push("Funcionário se mantém adequado à função é obrigatório.");
  if (!payload.needed_new_training?.trim()) errors.push("Houve necessidade de novos treinamentos é obrigatório.");
  if (payload.needed_new_training === "Sim") {
    if (!payload.training_classification?.trim()) errors.push("Classificação é obrigatória quando houve necessidade de treinamentos.");
    const topics = labelsFromOptionItems(payload.training_topics);
    if (!topics.length) errors.push("Treinamento em é obrigatório quando houve necessidade de treinamentos.");
  }
  return errors;
}
