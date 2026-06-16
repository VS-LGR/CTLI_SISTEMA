import { validateRequiredFileNameFields } from "./masterDocumentFileName";

export function validateDocumentBeforeActivation(doc) {
  const errors = [];
  if (!doc.title?.trim()) errors.push("Título obrigatório");
  if (!doc.type) errors.push("Tipo obrigatório");
  if (!doc.current_revision?.trim()) errors.push("Revisão obrigatória");
  if (!doc.current_issue_date) errors.push("Data de emissão obrigatória");
  if (!doc.status) errors.push("Status obrigatório");
  if (!doc.approval_responsible_id) errors.push("Responsável pela aprovação obrigatório");
  if (doc.type === "registro" && !doc.retention_time) {
    errors.push("Tempo de retenção obrigatório para registros");
  }
  if (doc.template_key) {
    if (!doc.export_file_name_pattern?.trim()) errors.push("Nome padrão de exportação obrigatório");
    if (!doc.file_naming_rule?.trim()) errors.push("Regra de nome do arquivo obrigatória");
  }
  return { valid: errors.length === 0, errors };
}

export function validateRevisionBeforeApproval(revision) {
  const errors = [];
  if (!revision.revision_number?.trim()) errors.push("Número da revisão obrigatório");
  if (!revision.issue_date) errors.push("Data de emissão obrigatória");
  if (!revision.change_description?.trim()) errors.push("Descrição da alteração obrigatória");
  if (!revision.approved_by_id) errors.push("Responsável pela aprovação obrigatório");
  return { valid: errors.length === 0, errors };
}

export function validateExternalDocument(ext) {
  const errors = [];
  if (!ext.title?.trim()) errors.push("Título obrigatório");
  if (!ext.consultation_location?.trim()) errors.push("Local para consulta obrigatório");
  if (!ext.external_revision?.trim()) errors.push("Revisão / versão externa obrigatória");
  if (!ext.last_consultation_date) errors.push("Data da última consulta obrigatória");
  if (!ext.consultation_period_months) errors.push("Frequência de consulta obrigatória");
  if (!ext.consultation_responsible_id) errors.push("Responsável pela consulta obrigatório");
  if (!ext.validity_status) errors.push("Status de validade obrigatório");
  return { valid: errors.length === 0, errors };
}

export function validateFileNameExport(rule, context, fileName) {
  const errors = [];
  if (!rule?.pattern && !fileName) errors.push("Regra de nome cadastrada");
  const fieldCheck = validateRequiredFileNameFields(rule, context);
  if (!fieldCheck.valid) errors.push(`Campos obrigatórios: ${fieldCheck.missing.join(", ")}`);
  if (/undefined|null|NaN|#N\/D|#VALOR!/i.test(fileName || "")) {
    errors.push("Nome de arquivo contém valores inválidos");
  }
  return { valid: errors.length === 0, errors };
}

export function canUseDocumentForExport(doc) {
  if (!doc) return { allowed: false, reason: "Documento não encontrado" };
  if (doc.isObsolete || doc.status === "obsoleto" || doc.status === "retido_como_obsoleto") {
    return { allowed: false, reason: "Documento obsoleto" };
  }
  return { allowed: true };
}
