import { PERSONNEL_DOC_DEFAULTS } from "@/lib/personnelDocMeta";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function emptyPositionForm() {
  const d = PERSONNEL_DOC_DEFAULTS.competency;
  return {
    title: "",
    inclusion_date: todayIso(),
    last_update_date: todayIso(),
    required_education: "",
    desired_education: "",
    technical_knowledge: [],
    qualification: [],
    experience: [],
    skills: [],
    general_knowledge: [],
    immediate_supervisor: "",
    function_activities: "",
    technical_authorities: [],
    managerial_authorities: [],
    internal_trainings: [],
    analysis_approval_responsible_id: "",
    analysis_approval_responsible_na: false,
    status: "ativo",
    document_code: d.code,
    document_reference: d.reference,
    document_revision: d.revision,
    document_model_issue_date: d.modelIssueDate,
  };
}

export function emptyAdequacyForm() {
  const d = PERSONNEL_DOC_DEFAULTS.adequacy;
  return {
    employee_id: "",
    position_id: "",
    registration_number: "",
    admission_date: "",
    last_update_date: todayIso(),
    occupant_name: "",
    position_title: "",
    current_education: "",
    immediate_supervisor: "",
    technical_knowledge: [],
    qualification: [],
    experience: [],
    skills: [],
    general_knowledge: [],
    function_activities: "",
    technical_authorities: [],
    managerial_authorities: [],
    internal_trainings: [],
    analysis_approval_responsible_id: "",
    analysis_approval_responsible_name: "",
    analysis_approval_responsible_na: false,
    adequacy_status: "rascunho",
    notes: "",
    document_code: d.code,
    document_reference: d.reference,
    document_revision: d.revision,
    document_model_issue_date: d.modelIssueDate,
  };
}

export function emptyMonitoringForm() {
  const d = PERSONNEL_DOC_DEFAULTS.monitoring;
  return {
    employee_id: "",
    position_id: "",
    registration_number: "",
    admission_date: "",
    occupant_name: "",
    position_title: "",
    monitoring_reason: "",
    current_education: "",
    immediate_supervisor: "",
    technical_knowledge: [],
    qualification: [],
    skills: [],
    general_knowledge: [],
    internal_trainings: [],
    needed_new_training: "",
    training_classification: "",
    training_topics: [],
    analysis_approval_responsible_id: "",
    analysis_approval_responsible_name: "",
    occupation_authorization_date: "",
    supervision_period: "",
    monitoring_methods: [],
    last_interlaboratory_date: "",
    last_intralaboratory_date: "",
    responsible_organization: "",
    report_number: "",
    last_update_date: todayIso(),
    next_monitoring_date: "",
    employee_remains_suitable: "",
    notes: "",
    document_code: d.code,
    document_reference: d.reference,
    document_revision: d.revision,
    document_model_issue_date: d.modelIssueDate,
  };
}
