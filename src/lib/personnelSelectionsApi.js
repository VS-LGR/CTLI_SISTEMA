import { supabase } from "@/lib/supabaseClient";
import { PERSONNEL_DOC_DEFAULTS } from "@/lib/personnelDocMeta";
import { buildPositionSnapshot } from "@/lib/personnelSnapshots";
import { assertSupabasePersonnel } from "@/lib/personnelStandardOptionsApi";
import { getPosition } from "@/lib/personnelPositionsApi";

async function loadEmployeesMap(tenantId) {
  const { data, error } = await supabase.from("employee_registrations").select("*").eq("tenant_id", tenantId);
  if (error) throw error;
  const map = {};
  for (const e of data || []) map[e.id] = e;
  return map;
}

export async function listSelections(tenantId) {
  assertSupabasePersonnel();
  const { data, error } = await supabase
    .from("personnel_selections")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("selection_date", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getSelection(id) {
  assertSupabasePersonnel();
  const { data, error } = await supabase.from("personnel_selections").select("*").eq("id", id).single();
  if (error) throw error;
  return data;
}

function selectionRowFromPayload(tenantId, payload, snapshots, defs) {
  return {
    tenant_id: tenantId,
    selection_date: payload.selection_date,
    vacancy: payload.vacancy || "",
    required_education_level: payload.required_education_level || "",
    selection_conductor_id: payload.selection_conductor_id || null,
    selection_conductor_name: payload.selection_conductor_name || "",
    candidate_name: payload.candidate_name || "",
    position_id: payload.position_id || null,
    position_snapshot: snapshots.position_snapshot,
    position_title: payload.position_title || "",
    selected_education_levels: payload.selected_education_levels || [],
    selected_position_attributions: payload.selected_position_attributions || {},
    function_activities: payload.function_activities || "",
    technical_authorities: payload.technical_authorities || [],
    managerial_authorities: payload.managerial_authorities || [],
    selected_general_knowledge: payload.selected_general_knowledge || [],
    selected_technical_knowledge: payload.selected_technical_knowledge || [],
    technical_knowledge_other: payload.technical_knowledge_other || "",
    selected_skills: payload.selected_skills || [],
    selected_qualifications: payload.selected_qualifications || [],
    qualification_other: payload.qualification_other || "",
    selected_experience: payload.selected_experience || [],
    conclusive_opinion_approved: payload.conclusive_opinion_approved,
    conclusive_opinion_text: payload.conclusive_opinion_text || "",
    analysis_approval_responsible_id: payload.analysis_approval_responsible_id || null,
    analysis_approval_responsible_name: payload.analysis_approval_responsible_name || "",
    notes: payload.notes || "",
    document_code: payload.document_code || defs.code,
    document_reference: payload.document_reference || defs.reference,
    document_revision: payload.document_revision || defs.revision,
    document_model_issue_date: payload.document_model_issue_date || defs.modelIssueDate,
  };
}

async function buildSnapshots(tenantId, positionId, approvalId, conductorId) {
  const employeesById = await loadEmployeesMap(tenantId);
  let position = null;
  if (positionId) position = await getPosition(positionId);
  const approval = approvalId ? employeesById[approvalId] : null;
  return {
    position_snapshot: buildPositionSnapshot(position, { approvalEmployee: approval }),
    conductor_name: conductorId ? employeesById[conductorId]?.full_name || "" : "",
    approval_name: approval?.full_name || "",
  };
}

export async function createSelection(tenantId, payload) {
  assertSupabasePersonnel();
  const defs = PERSONNEL_DOC_DEFAULTS.personnelSelection;
  const snap = await buildSnapshots(
    tenantId,
    payload.position_id,
    payload.analysis_approval_responsible_id,
    payload.selection_conductor_id,
  );
  const row = selectionRowFromPayload(tenantId, {
    ...payload,
    selection_conductor_name: payload.selection_conductor_name || snap.conductor_name,
    analysis_approval_responsible_name: payload.analysis_approval_responsible_name || snap.approval_name,
  }, snap, defs);

  const { data, error } = await supabase.from("personnel_selections").insert(row).select().single();
  if (error) throw error;
  return data;
}

export async function updateSelection(id, tenantId, payload) {
  assertSupabasePersonnel();
  const snap = await buildSnapshots(
    tenantId,
    payload.position_id,
    payload.analysis_approval_responsible_id,
    payload.selection_conductor_id,
  );
  const defs = PERSONNEL_DOC_DEFAULTS.personnelSelection;
  const row = selectionRowFromPayload(tenantId, {
    ...payload,
    selection_conductor_name: payload.selection_conductor_name || snap.conductor_name,
    analysis_approval_responsible_name: payload.analysis_approval_responsible_name || snap.approval_name,
  }, snap, defs);
  delete row.tenant_id;

  const { data, error } = await supabase.from("personnel_selections").update(row).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function duplicateSelection(id, tenantId) {
  const src = await getSelection(id);
  const { id: _id, created_at, updated_at, ...rest } = src;
  return createSelection(tenantId, {
    ...rest,
    selection_date: new Date().toISOString().slice(0, 10),
  });
}

export async function deleteSelection(id) {
  assertSupabasePersonnel();
  const { error } = await supabase.from("personnel_selections").delete().eq("id", id);
  if (error) throw error;
}
