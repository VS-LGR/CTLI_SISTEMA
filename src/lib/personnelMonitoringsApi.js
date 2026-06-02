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

async function loadEmployeesMap(tenantId) {
  const { data, error } = await supabase.from("employee_registrations").select("*").eq("tenant_id", tenantId);
  if (error) throw error;
  const map = {};
  for (const e of data || []) map[e.id] = e;
  return map;
}

export async function listMonitorings(tenantId) {
  assertSupabasePersonnel();
  const { data, error } = await supabase
    .from("personnel_monitorings")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("last_update_date", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getMonitoring(id) {
  assertSupabasePersonnel();
  const { data, error } = await supabase
    .from("personnel_monitorings")
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

export async function createMonitoring(tenantId, payload) {
  assertSupabasePersonnel();
  const defs = PERSONNEL_DOC_DEFAULTS.monitoring;
  const snapshots = await buildSnapshots(
    tenantId,
    payload.employee_id,
    payload.position_id,
    payload.analysis_approval_responsible_id,
  );
  const employeesById = await loadEmployeesMap(tenantId);
  const employee = employeesById[payload.employee_id];

  const { data, error } = await supabase
    .from("personnel_monitorings")
    .insert({
      tenant_id: tenantId,
      employee_id: payload.employee_id,
      position_id: payload.position_id,
      ...snapshots,
      registration_number: payload.registration_number || employee?.registration_code || "",
      admission_date: payload.admission_date || employee?.admission_date,
      occupant_name: payload.occupant_name || employee?.full_name || "",
      position_title: payload.position_title || "",
      monitoring_reason: payload.monitoring_reason || "",
      current_education: payload.current_education || "",
      immediate_supervisor: payload.immediate_supervisor || "",
      technical_knowledge: payload.technical_knowledge || [],
      qualification: payload.qualification || [],
      skills: payload.skills || [],
      general_knowledge: payload.general_knowledge || [],
      internal_trainings: payload.internal_trainings || [],
      needed_new_training: payload.needed_new_training || "",
      training_classification: payload.training_classification || "",
      training_topics: payload.training_topics || [],
      analysis_approval_responsible_id: payload.analysis_approval_responsible_id || null,
      analysis_approval_responsible_name: payload.analysis_approval_responsible_name || "",
      occupation_authorization_date: payload.occupation_authorization_date || null,
      supervision_period: payload.supervision_period || "",
      monitoring_methods: payload.monitoring_methods || [],
      last_interlaboratory_date: payload.last_interlaboratory_date || null,
      last_intralaboratory_date: payload.last_intralaboratory_date || null,
      responsible_organization: payload.responsible_organization || "",
      report_number: payload.report_number || "",
      last_update_date: payload.last_update_date || todayIso(),
      next_monitoring_date: payload.next_monitoring_date || null,
      employee_remains_suitable: payload.employee_remains_suitable || "",
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

export async function updateMonitoring(id, tenantId, payload) {
  assertSupabasePersonnel();
  const snapshots = await buildSnapshots(
    tenantId,
    payload.employee_id,
    payload.position_id,
    payload.analysis_approval_responsible_id,
  );

  const { data, error } = await supabase
    .from("personnel_monitorings")
    .update({
      employee_id: payload.employee_id,
      position_id: payload.position_id,
      ...snapshots,
      registration_number: payload.registration_number,
      admission_date: payload.admission_date,
      occupant_name: payload.occupant_name,
      position_title: payload.position_title,
      monitoring_reason: payload.monitoring_reason,
      current_education: payload.current_education,
      immediate_supervisor: payload.immediate_supervisor,
      technical_knowledge: payload.technical_knowledge,
      qualification: payload.qualification,
      skills: payload.skills,
      general_knowledge: payload.general_knowledge,
      internal_trainings: payload.internal_trainings,
      needed_new_training: payload.needed_new_training,
      training_classification: payload.training_classification,
      training_topics: payload.training_topics,
      analysis_approval_responsible_id: payload.analysis_approval_responsible_id || null,
      analysis_approval_responsible_name: payload.analysis_approval_responsible_name || "",
      occupation_authorization_date: payload.occupation_authorization_date,
      supervision_period: payload.supervision_period,
      monitoring_methods: payload.monitoring_methods,
      last_interlaboratory_date: payload.last_interlaboratory_date,
      last_intralaboratory_date: payload.last_intralaboratory_date,
      responsible_organization: payload.responsible_organization,
      report_number: payload.report_number,
      last_update_date: payload.last_update_date || todayIso(),
      next_monitoring_date: payload.next_monitoring_date,
      employee_remains_suitable: payload.employee_remains_suitable,
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

export async function duplicateMonitoring(id, tenantId) {
  const src = await getMonitoring(id);
  const { id: _id, created_at, updated_at, ...rest } = src;
  return createMonitoring(tenantId, {
    ...rest,
    last_update_date: todayIso(),
  });
}

export async function deleteMonitoring(id) {
  assertSupabasePersonnel();
  const { error } = await supabase.from("personnel_monitorings").delete().eq("id", id);
  if (error) throw error;
}
