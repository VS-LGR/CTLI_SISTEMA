import { supabase } from "@/lib/supabaseClient";
import { PERSONNEL_DOC_DEFAULTS } from "@/lib/personnelDocMeta";
import {
  buildEmployeePersonnelSnapshot,
  buildPositionSnapshot,
} from "@/lib/personnelSnapshots";
import { assertSupabasePersonnel } from "@/lib/personnelStandardOptionsApi";
import { getPosition } from "@/lib/personnelPositionsApi";
import {
  computeExperiencePeriodEnd,
  defaultExperienceEvaluationItems,
  EXPERIENCE_EVALUATION_ITEMS,
} from "@/lib/personnelExperienceConstants";

function periodEndFromAdmission(admissionDate) {
  return computeExperiencePeriodEnd(admissionDate) || null;
}

async function loadEmployeesMap(tenantId) {
  const { data, error } = await supabase.from("employee_registrations").select("*").eq("tenant_id", tenantId);
  if (error) throw error;
  const map = {};
  for (const e of data || []) map[e.id] = e;
  return map;
}

async function loadItems(evaluationId) {
  const { data, error } = await supabase
    .from("personnel_experience_evaluation_items")
    .select("*")
    .eq("evaluation_id", evaluationId)
    .order("item_number");
  if (error) throw error;
  return data || [];
}

async function syncItems(evaluationId, items) {
  await supabase.from("personnel_experience_evaluation_items").delete().eq("evaluation_id", evaluationId);
  const rows = (items || []).map((it) => ({
    evaluation_id: evaluationId,
    item_number: it.item_number,
    description: it.description || EXPERIENCE_EVALUATION_ITEMS.find((x) => x.item_number === it.item_number)?.description || "",
    score: it.score ?? null,
  }));
  if (!rows.length) return;
  const { error } = await supabase.from("personnel_experience_evaluation_items").insert(rows);
  if (error) throw error;
}

export async function listExperienceEvaluations(tenantId) {
  assertSupabasePersonnel();
  const { data, error } = await supabase
    .from("personnel_experience_evaluations")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("evaluation_date", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getExperienceEvaluation(id) {
  assertSupabasePersonnel();
  const { data, error } = await supabase
    .from("personnel_experience_evaluations")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  const items = await loadItems(id);
  return { ...data, items };
}

async function buildSnapshots(tenantId, employeeId, positionId) {
  const employeesById = await loadEmployeesMap(tenantId);
  const employee = employeesById[employeeId];
  let position = null;
  if (positionId) position = await getPosition(positionId);
  return {
    employee_snapshot: buildEmployeePersonnelSnapshot(employee, { employeesById }),
    position_snapshot: buildPositionSnapshot(position),
  };
}

export async function createExperienceEvaluation(tenantId, payload) {
  assertSupabasePersonnel();
  const defs = PERSONNEL_DOC_DEFAULTS.experienceEvaluation;
  const snapshots = await buildSnapshots(tenantId, payload.employee_id, payload.position_id);
  const { data, error } = await supabase
    .from("personnel_experience_evaluations")
    .insert({
      tenant_id: tenantId,
      employee_id: payload.employee_id,
      position_id: payload.position_id || null,
      ...snapshots,
      registration_number: payload.registration_number || "",
      occupant_name: payload.occupant_name || "",
      admission_date: payload.admission_date || null,
      position_title: payload.position_title || "",
      department: payload.department || "",
      evaluator_id: payload.evaluator_id || null,
      evaluator_name: payload.evaluator_name || "",
      evaluation_date: payload.evaluation_date,
      period_end_date: periodEndFromAdmission(payload.admission_date),
      average_score: payload.average_score ?? null,
      conclusive_opinion: payload.conclusive_opinion || "",
      signature_date: payload.signature_date || null,
      notes: payload.notes || "",
      document_code: payload.document_code || defs.code,
      document_reference: payload.document_reference || defs.reference,
      document_revision: payload.document_revision || defs.revision,
      document_model_issue_date: payload.document_model_issue_date || defs.modelIssueDate,
    })
    .select()
    .single();
  if (error) throw error;
  await syncItems(data.id, payload.items || defaultExperienceEvaluationItems());
  return getExperienceEvaluation(data.id);
}

export async function updateExperienceEvaluation(id, tenantId, payload) {
  assertSupabasePersonnel();
  const snapshots = await buildSnapshots(tenantId, payload.employee_id, payload.position_id);
  const { data, error } = await supabase
    .from("personnel_experience_evaluations")
    .update({
      employee_id: payload.employee_id,
      position_id: payload.position_id || null,
      ...snapshots,
      registration_number: payload.registration_number,
      occupant_name: payload.occupant_name,
      admission_date: payload.admission_date,
      position_title: payload.position_title,
      department: payload.department,
      evaluator_id: payload.evaluator_id || null,
      evaluator_name: payload.evaluator_name,
      evaluation_date: payload.evaluation_date,
      period_end_date: periodEndFromAdmission(payload.admission_date),
      average_score: payload.average_score ?? null,
      conclusive_opinion: payload.conclusive_opinion,
      signature_date: payload.signature_date || null,
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
  await syncItems(id, payload.items);
  return getExperienceEvaluation(id);
}

export async function duplicateExperienceEvaluation(id, tenantId) {
  const src = await getExperienceEvaluation(id);
  const { id: _id, created_at, updated_at, ...rest } = src;
  return createExperienceEvaluation(tenantId, {
    ...rest,
    items: src.items,
    evaluation_date: new Date().toISOString().slice(0, 10),
  });
}

export async function deleteExperienceEvaluation(id) {
  assertSupabasePersonnel();
  const { error } = await supabase.from("personnel_experience_evaluations").delete().eq("id", id);
  if (error) throw error;
}
