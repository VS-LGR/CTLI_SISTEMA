import { supabase } from "@/lib/supabaseClient";
import { PERSONNEL_DOC_DEFAULTS } from "@/lib/personnelDocMeta";
import { assertSupabasePersonnel, ensureStandardOptionsSeeded } from "@/lib/personnelStandardOptionsApi";
import {
  DEFAULT_PERSONNEL_POSITIONS,
  JOB_ROLE_TO_POSITION_TITLE,
} from "@/lib/personnelPositionsSeed";

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

/** Garante cargos padrão CTLI por título; vincula colaboradores sem position_id ao cargo legado (job_role). */
export async function ensureDefaultPositionsSeeded(tenantId) {
  assertSupabasePersonnel();
  await ensureStandardOptionsSeeded(tenantId);

  const { data: existing, error: existErr } = await supabase
    .from("personnel_positions")
    .select("id, title")
    .eq("tenant_id", tenantId);
  if (existErr) throw existErr;

  const titleToId = {};
  for (const row of existing || []) {
    titleToId[row.title] = row.id;
  }

  const defs = PERSONNEL_DOC_DEFAULTS.competency;
  const today = todayIso();
  const missing = DEFAULT_PERSONNEL_POSITIONS.filter((p) => !titleToId[p.title]);

  if (missing.length > 0) {
    const rows = missing.map((p) => ({
      tenant_id: tenantId,
      title: p.title,
      inclusion_date: today,
      last_update_date: today,
      required_education: p.required_education,
      desired_education: p.desired_education,
      technical_knowledge: p.technical_knowledge || [],
      qualification: p.qualification || [],
      experience: p.experience || [],
      skills: p.skills || [],
      general_knowledge: p.general_knowledge || [],
      immediate_supervisor: "",
      function_activities: p.function_activities || "",
      technical_authorities: p.technical_authorities || [],
      managerial_authorities: p.managerial_authorities || [],
      internal_trainings: p.internal_trainings || [],
      analysis_approval_responsible_id: null,
      status: "ativo",
      document_code: defs.code,
      document_reference: defs.reference,
      document_revision: defs.revision,
      document_model_issue_date: defs.modelIssueDate,
    }));

    const { data: inserted, error } = await supabase.from("personnel_positions").insert(rows).select("id, title");
    if (error) throw error;
    for (const row of inserted || []) {
      titleToId[row.title] = row.id;
    }
  }

  const { data: employees, error: empErr } = await supabase
    .from("employee_registrations")
    .select("id, job_role, position_id")
    .eq("tenant_id", tenantId);
  if (empErr) throw empErr;

  for (const emp of employees || []) {
    if (emp.position_id) continue;
    const title = JOB_ROLE_TO_POSITION_TITLE[emp.job_role];
    const posId = title ? titleToId[title] : null;
    if (!posId) continue;
    await supabase.from("employee_registrations").update({ position_id: posId }).eq("id", emp.id);
  }

  return Object.keys(titleToId).length;
}

export async function listPositions(tenantId, { status = null, seedIfEmpty = true } = {}) {
  assertSupabasePersonnel();
  if (seedIfEmpty) await ensureDefaultPositionsSeeded(tenantId);
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
      technical_authorities: payload.technical_authorities || [],
      managerial_authorities: payload.managerial_authorities || [],
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
