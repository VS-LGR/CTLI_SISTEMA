import { supabase } from "@/lib/supabaseClient";
import { computeExperiencePeriodEnd } from "@/lib/personnelExperienceConstants";
import { assertSupabasePersonnel } from "@/lib/personnelStandardOptionsApi";
import { listPositions } from "@/lib/personnelPositionsApi";
import { listAdequacies } from "@/lib/personnelAdequaciesApi";
import { listMonitorings } from "@/lib/personnelMonitoringsApi";
import { listExperienceEvaluations } from "@/lib/personnelExperienceEvaluationsApi";
import { listSelections } from "@/lib/personnelSelectionsApi";
import { listAttendanceLists } from "@/lib/personnelAttendanceListsApi";
import { PERSONNEL_REGISTRO_TOPICS } from "@/lib/personnelRegistrosConfig";
import {
  computePersonnelTopicStats,
  filterPersonnelTopicRows,
} from "@/lib/personnelRegistrosListUtils";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function monitoringSortKey(row) {
  const date = row?.last_update_date || row?.created_at || "";
  return String(date).slice(0, 10);
}

/**
 * Colaboradores com cargo atribuído sem nenhuma adequação concluída (RE-6.2A).
 * @param {Array<{ id: string, position_id?: string | null }>} employees
 * @param {Array<{ employee_id: string, adequacy_status: string }>} adequacies
 */
export function employeesWithoutCompletedAdequacy(employees, adequacies) {
  const withPosition = (employees || []).filter((e) => e.position_id);
  const completedIds = new Set(
    (adequacies || [])
      .filter((a) => a.adequacy_status === "concluida")
      .map((a) => a.employee_id),
  );
  return withPosition.filter((e) => !completedIds.has(e.id)).length;
}

/**
 * Colaboradores cujo último monitoramento tem próxima data vencida.
 * @param {Array<{ employee_id: string, next_monitoring_date?: string, last_update_date?: string, created_at?: string }>} monitorings
 */
export function employeesWithOverdueMonitoring(monitorings) {
  const today = todayIso();
  const latestByEmployee = new Map();

  for (const row of monitorings || []) {
    if (!row.employee_id) continue;
    const existing = latestByEmployee.get(row.employee_id);
    if (!existing || monitoringSortKey(row) > monitoringSortKey(existing)) {
      latestByEmployee.set(row.employee_id, row);
    }
  }

  let count = 0;
  for (const row of latestByEmployee.values()) {
    const next = row.next_monitoring_date ? String(row.next_monitoring_date).slice(0, 10) : "";
    if (next && next < today) count += 1;
  }
  return count;
}

/**
 * Colaboradores com período de experiência encerrado (3 meses) sem RE-6.2B.
 * @param {Array<{ id: string, admission_date?: string }>} employees
 * @param {Array<{ employee_id: string }>} evaluations
 */
export function employeesWithPendingExperience(employees, evaluations) {
  const today = todayIso();
  const evaluatedIds = new Set((evaluations || []).map((e) => e.employee_id));
  let count = 0;

  for (const emp of employees || []) {
    if (!emp.admission_date || evaluatedIds.has(emp.id)) continue;
    const periodEnd = computeExperiencePeriodEnd(emp.admission_date);
    if (periodEnd && periodEnd <= today) count += 1;
  }
  return count;
}

/**
 * @param {string} tenantId
 * @returns {Promise<{ withoutCompletedAdequacy: number, overdueMonitoring: number, pendingExperience: number }>}
 */
export async function fetchPersonnelComplianceStats(tenantId) {
  assertSupabasePersonnel();
  if (!tenantId) {
    return { withoutCompletedAdequacy: 0, overdueMonitoring: 0, pendingExperience: 0 };
  }

  const [employeesRes, adequaciesRes, evaluationsRes, monitoringsRes] = await Promise.all([
    supabase
      .from("employee_registrations")
      .select("id, admission_date, position_id")
      .eq("tenant_id", tenantId),
    supabase
      .from("personnel_competency_adequacies")
      .select("employee_id, adequacy_status")
      .eq("tenant_id", tenantId),
    supabase
      .from("personnel_experience_evaluations")
      .select("employee_id")
      .eq("tenant_id", tenantId),
    supabase
      .from("personnel_monitorings")
      .select("employee_id, next_monitoring_date, last_update_date, created_at")
      .eq("tenant_id", tenantId),
  ]);

  if (employeesRes.error) throw employeesRes.error;
  if (adequaciesRes.error) throw adequaciesRes.error;
  if (evaluationsRes.error) throw evaluationsRes.error;
  if (monitoringsRes.error) throw monitoringsRes.error;

  const employees = employeesRes.data || [];
  const adequacies = adequaciesRes.data || [];
  const evaluations = evaluationsRes.data || [];
  const monitorings = monitoringsRes.data || [];

  return {
    withoutCompletedAdequacy: employeesWithoutCompletedAdequacy(employees, adequacies),
    overdueMonitoring: employeesWithOverdueMonitoring(monitorings),
    pendingExperience: employeesWithPendingExperience(employees, evaluations),
  };
}

/**
 * Carrega linhas brutas de todos os tópicos de registros (para métricas da dashboard).
 * @param {string} tenantId
 */
export async function fetchPersonnelRegistrosTopicRows(tenantId) {
  assertSupabasePersonnel();
  if (!tenantId) return {};

  const [
    activePositions,
    obsoletePositions,
    adequacies,
    monitorings,
    experiences,
    selections,
    attendances,
  ] = await Promise.all([
    listPositions(tenantId, { status: "ativo" }),
    listPositions(tenantId, { status: "inativo", seedIfEmpty: false }),
    listAdequacies(tenantId),
    listMonitorings(tenantId),
    listExperienceEvaluations(tenantId),
    listSelections(tenantId),
    listAttendanceLists(tenantId),
  ]);

  return {
    "re-62c": [...activePositions, ...obsoletePositions],
    "re-62a": adequacies,
    "re-62e": monitorings,
    "re-62b": experiences,
    "re-62f": selections,
    "re-62d": attendances,
  };
}

/**
 * @param {Record<string, Array<Record<string, unknown>>>} rowsByTopic
 * @param {{ query?: string, date?: string }} externalFilters
 */
export function computePersonnelRegistrosTopicStats(rowsByTopic, externalFilters = {}) {
  const result = {};
  for (const topic of PERSONNEL_REGISTRO_TOPICS) {
    const rows = rowsByTopic?.[topic.id] || [];
    const filtered = filterPersonnelTopicRows(rows, externalFilters, topic.id);
    result[topic.id] = computePersonnelTopicStats(topic.id, filtered);
  }
  return result;
}
