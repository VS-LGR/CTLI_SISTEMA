import { educationLabel } from "@/lib/cadastroConstants";
import { labelsFromOptionItems, normalizeAuthorityValue } from "@/lib/personnelConstants";

function employeeSupervisorName(employee, employeesById) {
  if (!employee?.supervisor_id) return "";
  const sup = employeesById?.[employee.supervisor_id];
  return sup?.full_name || "";
}

export function buildEmployeePersonnelSnapshot(employee, { employeesById = {}, signatureUrl = null } = {}) {
  if (!employee) return {};
  return {
    id: employee.id,
    registration_code: employee.registration_code || "",
    full_name: employee.full_name || "",
    admission_date: employee.admission_date || null,
    education_level: employee.education_level || "",
    education_level_label: educationLabel(employee.education_level),
    position_id: employee.position_id || null,
    supervisor_id: employee.supervisor_id || null,
    supervisor_name: employeeSupervisorName(employee, employeesById),
    signature_storage_path: employee.signature_storage_path || "",
    signature_url: signatureUrl || null,
  };
}

export function buildPositionSnapshot(position, { approvalEmployee = null } = {}) {
  if (!position) return {};
  return {
    id: position.id,
    title: position.title || "",
    inclusion_date: position.inclusion_date || null,
    last_update_date: position.last_update_date || null,
    required_education: position.required_education || "",
    desired_education: position.desired_education || "",
    technical_knowledge: position.technical_knowledge || [],
    qualification: position.qualification || [],
    experience: position.experience || [],
    skills: position.skills || [],
    general_knowledge: position.general_knowledge || [],
    immediate_supervisor: position.immediate_supervisor || "",
    function_activities: position.function_activities || "",
    technical_authorities: normalizeAuthorityValue(position.technical_authorities),
    managerial_authorities: normalizeAuthorityValue(position.managerial_authorities),
    internal_trainings: position.internal_trainings || [],
    analysis_approval_responsible_id: position.analysis_approval_responsible_id || null,
    analysis_approval_responsible_name: approvalEmployee?.full_name || "",
    document_code: position.document_code || "",
    document_reference: position.document_reference || "",
    document_revision: position.document_revision || "",
    document_model_issue_date: position.document_model_issue_date || null,
  };
}

export function mergePositionIntoFormFields(position) {
  if (!position) return {};
  return {
    position_id: position.id,
    position_title: position.title || "",
    required_education: position.required_education || "",
    desired_education: position.desired_education || "",
    technical_knowledge: [...(position.technical_knowledge || [])],
    qualification: [...(position.qualification || [])],
    experience: [...(position.experience || [])],
    skills: [...(position.skills || [])],
    general_knowledge: [...(position.general_knowledge || [])],
    immediate_supervisor: position.immediate_supervisor || "",
    function_activities: position.function_activities || "",
    technical_authorities: normalizeAuthorityValue(position.technical_authorities),
    managerial_authorities: normalizeAuthorityValue(position.managerial_authorities),
    internal_trainings: [...(position.internal_trainings || [])],
    analysis_approval_responsible_id: position.analysis_approval_responsible_id || "",
    analysis_approval_responsible_name: "",
  };
}

export function formatOptionListForPdf(items) {
  const labels = labelsFromOptionItems(items);
  return labels.length ? labels.join("\n") : "-";
}
