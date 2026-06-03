import { PERSONNEL_DOC_DEFAULTS } from "@/lib/personnelDocMeta";
import { defaultExperienceEvaluationItems } from "@/lib/personnelExperienceConstants";
import { DEFAULT_POSITION_ATTRIBUTIONS } from "@/lib/personnelSelectionConstants";

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

export function emptyExperienceEvaluationForm() {
  const d = PERSONNEL_DOC_DEFAULTS.experienceEvaluation;
  return {
    employee_id: "",
    position_id: "",
    registration_number: "",
    occupant_name: "",
    admission_date: "",
    position_title: "",
    department: "",
    evaluator_id: "",
    evaluator_name: "",
    evaluation_date: todayIso(),
    average_score: null,
    conclusive_opinion: "",
    signature_date: todayIso(),
    notes: "",
    items: defaultExperienceEvaluationItems(),
    document_code: d.code,
    document_reference: d.reference,
    document_revision: d.revision,
    document_model_issue_date: d.modelIssueDate,
  };
}

export function emptySelectionForm() {
  const d = PERSONNEL_DOC_DEFAULTS.personnelSelection;
  return {
    selection_date: todayIso(),
    vacancy: "",
    required_education_level: "",
    selection_conductor_id: "",
    selection_conductor_name: "",
    candidate_name: "",
    position_id: "",
    position_title: "",
    selected_education_levels: [],
    selected_position_attributions: { ...DEFAULT_POSITION_ATTRIBUTIONS },
    function_activities: "",
    technical_authorities: [],
    managerial_authorities: [],
    selected_general_knowledge: [],
    selected_technical_knowledge: [],
    technical_knowledge_other: "",
    selected_skills: [],
    selected_qualifications: [],
    qualification_other: "",
    selected_experience: [],
    conclusive_opinion_approved: null,
    conclusive_opinion_text: "",
    analysis_approval_responsible_id: "",
    analysis_approval_responsible_name: "",
    notes: "",
    document_code: d.code,
    document_reference: d.reference,
    document_revision: d.revision,
    document_model_issue_date: d.modelIssueDate,
  };
}

export function emptyAttendanceListForm() {
  const d = PERSONNEL_DOC_DEFAULTS.attendanceList;
  return {
    course_title: "",
    schedule: "",
    executing_entity: "",
    course_date: todayIso(),
    duration_hours: "",
    instructors: "",
    content_summary: "",
    observations: "",
    concludes_count: 0,
    attendance_percentage: null,
    approved_count: 0,
    reproved_count: 0,
    instructor_responsible: "",
    participants: [],
    suggested_training: "",
    document_code: d.code,
    document_reference: d.reference,
    document_revision: d.revision,
    document_model_issue_date: d.modelIssueDate,
  };
}

export function emptyAttendanceParticipant(orderNumber = 1) {
  return {
    employee_id: "",
    order_number: orderNumber,
    full_name: "",
    department: "",
    signature_status: "",
    frequency_percentage: null,
    result: "",
  };
}
