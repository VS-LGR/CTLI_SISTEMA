import { supabase } from "@/lib/supabaseClient";
import { PERSONNEL_DOC_DEFAULTS } from "@/lib/personnelDocMeta";
import {
  buildEmployeePersonnelSnapshot,
  buildPositionSnapshot,
} from "@/lib/personnelSnapshots";
import { assertSupabasePersonnel } from "@/lib/personnelStandardOptionsApi";
import { getPosition } from "@/lib/personnelPositionsApi";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

async function loadEmployee(id) {
  if (!id) return null;
  const { data, error } = await supabase.from("employee_registrations").select("*").eq("id", id).single();
  if (error) throw error;
  return data;
}

async function loadEmployeesMap(tenantId) {
  const { data, error } = await supabase.from("employee_registrations").select("*").eq("tenant_id", tenantId);
  if (error) throw error;
  const map = {};
  for (const e of data || []) map[e.id] = e;
  return map;
}

export async function listAdequacies(tenantId) {
  assertSupabasePersonnel();
  const { data, error } = await supabase
    .from("personnel_competency_adequacies")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("last_update_date", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getAdequacy(id) {
  assertSupabasePersonnel();
  const { data, error } = await supabase
    .from("personnel_competency_adequacies")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

async function buildSnapshots(tenantId, employeeId, positionId, approvalId) {
  const employeesById = await loadEmployeesMap(tenantId);
  const employee = employeesById[employeeId];
  const position = await getPosition(positionId);
  const approval = approvalId ? employeesById[approvalId] : null;
  return {
    employee_snapshot: buildEmployeePersonnelSnapshot(employee, { employeesById }),
    position_snapshot: buildPositionSnapshot(position, { approvalEmployee: approval }),
  };
}

export async function createAdequacy(tenantId, payload) {
  assertSupabasePersonnel();
  const defs = PERSONNEL_DOC_DEFAULTS.adequacy;
  const snapshots = await buildSnapshots(
    tenantId,
    payload.employee_id,
    payload.position_id,
    payload.analysis_approval_responsible_id,
  );
  const employee = await loadEmployee(payload.employee_id);

  const { data, error } = await supabase
    .from("personnel_competency_adequacies")
    .insert({
      tenant_id: tenantId,
      employee_id: payload.employee_id,
      position_id: payload.position_id,
      ...snapshots,
      registration_number: payload.registration_number || employee?.registration_code || "",
      admission_date: payload.admission_date || employee?.admission_date,
      last_update_date: payload.last_update_date || todayIso(),
      occupant_name: payload.occupant_name || employee?.full_name || "",
      position_title: payload.position_title || "",
      current_education: payload.current_education || "",
      immediate_supervisor: payload.immediate_supervisor || "",
      technical_knowledge: payload.technical_knowledge || [],
      qualification: payload.qualification || [],
      experience: payload.experience || [],
      skills: payload.skills || [],
      general_knowledge: payload.general_knowledge || [],
      function_activities: payload.function_activities || "",
      technical_authorities: payload.technical_authorities || "",
      managerial_authorities: payload.managerial_authorities || "",
      internal_trainings: payload.internal_trainings || [],
      analysis_approval_responsible_id: payload.analysis_approval_responsible_id || null,
      analysis_approval_responsible_name: payload.analysis_approval_responsible_name || "",
      adequacy_status: payload.adequacy_status || "rascunho",
      notes: payload.notes || "",
      document_code: payload.document_code || defs.code,
      document_reference: payload.document_reference || defs.reference,
      document_revision: payload.document_revision || defs.revision,
      document_model_issue_date: payload.document_model_issue_date || defs.modelIssueDate,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateAdequacy(id, tenantId, payload) {
  assertSupabasePersonnel();
  const snapshots = await buildSnapshots(
    tenantId,
    payload.employee_id,
    payload.position_id,
    payload.analysis_approval_responsible_id,
  );

  const { data, error } = await supabase
    .from("personnel_competency_adequacies")
    .update({
      employee_id: payload.employee_id,
      position_id: payload.position_id,
      ...snapshots,
      registration_number: payload.registration_number,
      admission_date: payload.admission_date,
      last_update_date: payload.last_update_date || todayIso(),
      occupant_name: payload.occupant_name,
      position_title: payload.position_title,
      current_education: payload.current_education,
      immediate_supervisor: payload.immediate_supervisor,
      technical_knowledge: payload.technical_knowledge,
      qualification: payload.qualification,
      experience: payload.experience,
      skills: payload.skills,
      general_knowledge: payload.general_knowledge,
      function_activities: payload.function_activities,
      technical_authorities: payload.technical_authorities,
      managerial_authorities: payload.managerial_authorities,
      internal_trainings: payload.internal_trainings,
      analysis_approval_responsible_id: payload.analysis_approval_responsible_id || null,
      analysis_approval_responsible_name: payload.analysis_approval_responsible_name || "",
      adequacy_status: payload.adequacy_status,
      notes: payload.notes || "",
      document_code: payload.document_code,
      document_reference: payload.document_reference,
      document_revision: payload.document_revision,
      document_model_issue_date: payload.document_model_issue_date,
    })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function duplicateAdequacy(id, tenantId) {
  const src = await getAdequacy(id);
  const { id: _id, created_at, updated_at, ...rest } = src;
  return createAdequacy(tenantId, {
    ...rest,
    adequacy_status: "rascunho",
    last_update_date: todayIso(),
  });
}

export async function deleteAdequacy(id) {
  assertSupabasePersonnel();
  const { error } = await supabase.from("personnel_competency_adequacies").delete().eq("id", id);
  if (error) throw error;
}
