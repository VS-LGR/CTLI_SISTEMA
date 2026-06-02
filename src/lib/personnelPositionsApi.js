import { supabase } from "@/lib/supabaseClient";
import { PERSONNEL_DOC_DEFAULTS } from "@/lib/personnelDocMeta";
import { assertSupabasePersonnel } from "@/lib/personnelStandardOptionsApi";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function mapPositionRow(row) {
  if (!row) return row;
  return {
    ...row,
    analysis_approval_responsible: row.analysis_approval_responsible || null,
  };
}

export async function listPositions(tenantId, { status = null } = {}) {
  assertSupabasePersonnel();
  let q = supabase
    .from("personnel_positions")
    .select("*, analysis_approval_responsible:analysis_approval_responsible_id(full_name)")
    .eq("tenant_id", tenantId)
    .order("title");
  if (status) q = q.eq("status", status);
  const { data, error } = await q;
  if (error) throw error;
  return (data || []).map(mapPositionRow);
}

export async function getPosition(id) {
  assertSupabasePersonnel();
  const { data, error } = await supabase
    .from("personnel_positions")
    .select("*, analysis_approval_responsible:analysis_approval_responsible_id(id, full_name)")
    .eq("id", id)
    .single();
  if (error) throw error;
  return mapPositionRow(data);
}

export async function createPosition(tenantId, payload) {
  assertSupabasePersonnel();
  const defs = PERSONNEL_DOC_DEFAULTS.competency;
  const { data, error } = await supabase
    .from("personnel_positions")
    .insert({
      tenant_id: tenantId,
      title: payload.title.trim(),
      inclusion_date: payload.inclusion_date || todayIso(),
      last_update_date: payload.last_update_date || todayIso(),
      required_education: payload.required_education || "",
      desired_education: payload.desired_education || "",
      technical_knowledge: payload.technical_knowledge || [],
      qualification: payload.qualification || [],
      experience: payload.experience || [],
      skills: payload.skills || [],
      general_knowledge: payload.general_knowledge || [],
      immediate_supervisor: payload.immediate_supervisor || "",
      function_activities: payload.function_activities || "",
      technical_authorities: payload.technical_authorities || "",
      managerial_authorities: payload.managerial_authorities || "",
      internal_trainings: payload.internal_trainings || [],
      analysis_approval_responsible_id: payload.analysis_approval_responsible_id || null,
      status: payload.status || "ativo",
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

export async function updatePosition(id, payload) {
  assertSupabasePersonnel();
  const { data, error } = await supabase
    .from("personnel_positions")
    .update({
      title: payload.title?.trim(),
      last_update_date: payload.last_update_date || todayIso(),
      required_education: payload.required_education,
      desired_education: payload.desired_education,
      technical_knowledge: payload.technical_knowledge,
      qualification: payload.qualification,
      experience: payload.experience,
      skills: payload.skills,
      general_knowledge: payload.general_knowledge,
      immediate_supervisor: payload.immediate_supervisor,
      function_activities: payload.function_activities,
      technical_authorities: payload.technical_authorities,
      managerial_authorities: payload.managerial_authorities,
      internal_trainings: payload.internal_trainings,
      analysis_approval_responsible_id: payload.analysis_approval_responsible_id || null,
      status: payload.status,
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

export async function inactivatePosition(id) {
  return updatePosition(id, { status: "inativo", last_update_date: todayIso() });
}

export async function duplicatePosition(id, tenantId) {
  const src = await getPosition(id);
  const copy = await createPosition(tenantId, {
    ...src,
    title: `${src.title} (cópia)`,
    inclusion_date: todayIso(),
    last_update_date: todayIso(),
    status: "ativo",
  });
  return copy;
}

export async function deletePosition(id) {
  assertSupabasePersonnel();
  const { error } = await supabase.from("personnel_positions").delete().eq("id", id);
  if (error) throw error;
}
