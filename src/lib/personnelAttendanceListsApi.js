import { supabase } from "@/lib/supabaseClient";
import { PERSONNEL_DOC_DEFAULTS } from "@/lib/personnelDocMeta";
import { buildEmployeePersonnelSnapshot } from "@/lib/personnelSnapshots";
import { assertSupabasePersonnel } from "@/lib/personnelStandardOptionsApi";

async function loadEmployeesMap(tenantId) {
  const { data, error } = await supabase.from("employee_registrations").select("*").eq("tenant_id", tenantId);
  if (error) throw error;
  const map = {};
  for (const e of data || []) map[e.id] = e;
  return map;
}

async function loadParticipants(listId) {
  const { data, error } = await supabase
    .from("personnel_attendance_participants")
    .select("*")
    .eq("attendance_list_id", listId)
    .order("order_number");
  if (error) throw error;
  return data || [];
}

async function syncParticipants(listId, participants, tenantId) {
  await supabase.from("personnel_attendance_participants").delete().eq("attendance_list_id", listId);
  if (!participants?.length) return;
  const employeesById = await loadEmployeesMap(tenantId);
  const rows = participants.map((p, idx) => {
    const emp = p.employee_id ? employeesById[p.employee_id] : null;
    return {
      attendance_list_id: listId,
      employee_id: p.employee_id || null,
      employee_snapshot: emp ? buildEmployeePersonnelSnapshot(emp, { employeesById }) : p.employee_snapshot || {},
      order_number: p.order_number ?? idx + 1,
      full_name: p.full_name || emp?.full_name || "",
      department: p.department || "",
      signature_status: p.signature_status || "",
      frequency_percentage: p.frequency_percentage ?? null,
      result: p.result || "",
    };
  });
  const { error } = await supabase.from("personnel_attendance_participants").insert(rows);
  if (error) throw error;
}

export function computeAttendanceMovement(participants) {
  const list = participants || [];
  const withResult = list.filter((p) => p.result);
  const approved = withResult.filter((p) => String(p.result).toLowerCase().includes("aprovado")).length;
  const reproved = withResult.filter((p) => String(p.result).toLowerCase().includes("reprovado")).length;
  const concluded = withResult.filter((p) => {
    const r = String(p.result).toLowerCase();
    return r.includes("aprovado") || r.includes("conclu");
  }).length;
  const freqs = list.map((p) => p.frequency_percentage).filter((f) => f !== null && f !== undefined && f !== "");
  const attendancePercentage = freqs.length
    ? Math.round((freqs.reduce((a, b) => a + Number(b), 0) / freqs.length) * 100) / 100
    : null;
  return { concludes_count: concluded, approved_count: approved, reproved_count: reproved, attendance_percentage: attendancePercentage };
}

export async function listAttendanceLists(tenantId) {
  assertSupabasePersonnel();
  const { data, error } = await supabase
    .from("personnel_attendance_lists")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("course_date", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getAttendanceList(id) {
  assertSupabasePersonnel();
  const { data, error } = await supabase.from("personnel_attendance_lists").select("*").eq("id", id).single();
  if (error) throw error;
  const participants = await loadParticipants(id);
  return { ...data, participants };
}

export async function createAttendanceList(tenantId, payload) {
  assertSupabasePersonnel();
  const defs = PERSONNEL_DOC_DEFAULTS.attendanceList;
  const { data, error } = await supabase
    .from("personnel_attendance_lists")
    .insert({
      tenant_id: tenantId,
      course_title: payload.course_title || "",
      schedule: payload.schedule || "",
      executing_entity: payload.executing_entity || "",
      course_date: payload.course_date,
      duration_hours: payload.duration_hours || "",
      instructors: payload.instructors || "",
      content_summary: payload.content_summary || "",
      observations: payload.observations || "",
      concludes_count: payload.concludes_count ?? 0,
      attendance_percentage: payload.attendance_percentage ?? null,
      approved_count: payload.approved_count ?? 0,
      reproved_count: payload.reproved_count ?? 0,
      instructor_responsible: payload.instructor_responsible || "",
      document_code: payload.document_code || defs.code,
      document_reference: payload.document_reference || defs.reference,
      document_revision: payload.document_revision || defs.revision,
      document_model_issue_date: payload.document_model_issue_date || defs.modelIssueDate,
    })
    .select()
    .single();
  if (error) throw error;
  await syncParticipants(data.id, payload.participants, tenantId);
  return getAttendanceList(data.id);
}

export async function updateAttendanceList(id, tenantId, payload) {
  assertSupabasePersonnel();
  const { data, error } = await supabase
    .from("personnel_attendance_lists")
    .update({
      course_title: payload.course_title,
      schedule: payload.schedule,
      executing_entity: payload.executing_entity,
      course_date: payload.course_date,
      duration_hours: payload.duration_hours,
      instructors: payload.instructors,
      content_summary: payload.content_summary,
      observations: payload.observations,
      concludes_count: payload.concludes_count,
      attendance_percentage: payload.attendance_percentage,
      approved_count: payload.approved_count,
      reproved_count: payload.reproved_count,
      instructor_responsible: payload.instructor_responsible,
      document_code: payload.document_code,
      document_reference: payload.document_reference,
      document_revision: payload.document_revision,
      document_model_issue_date: payload.document_model_issue_date,
    })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  await syncParticipants(id, payload.participants, tenantId);
  return getAttendanceList(id);
}

export async function duplicateAttendanceList(id, tenantId) {
  const src = await getAttendanceList(id);
  const { id: _id, created_at, updated_at, ...rest } = src;
  return createAttendanceList(tenantId, { ...rest, participants: src.participants });
}

export async function deleteAttendanceList(id) {
  assertSupabasePersonnel();
  const { error } = await supabase.from("personnel_attendance_lists").delete().eq("id", id);
  if (error) throw error;
}
