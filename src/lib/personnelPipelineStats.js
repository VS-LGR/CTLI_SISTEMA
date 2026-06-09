import { supabase } from "@/lib/supabaseClient";
import {
  EXPERIENCE_OPINION_APPROVED,
  EXPERIENCE_OPINION_REJECTED,
  resolveExperiencePeriodEndDate,
} from "@/lib/personnelExperienceConstants";
import { assertSupabasePersonnel } from "@/lib/personnelStandardOptionsApi";

export const PIPELINE_STAGES = {
  AGUARDANDO_ADMISSAO: "aguardando_admissao",
  EM_EXPERIENCIA: "em_experiencia",
  EXPERIENCIA_APROVADA: "experiencia_aprovada",
  ADEQUACAO_CONCLUIDA: "adequacao_concluida",
};

export const PIPELINE_STAGE_LABELS = {
  aguardando_admissao: "Aguardando admissão",
  em_experiencia: "Período experimental (90 dias)",
  experiencia_aprovada: "Experiência aprovada",
  adequacao_concluida: "Adequação concluída",
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function daysUntil(isoDate) {
  if (!isoDate) return null;
  const end = new Date(`${isoDate.slice(0, 10)}T12:00:00`);
  const now = new Date(`${todayIso()}T12:00:00`);
  return Math.ceil((end - now) / (1000 * 60 * 60 * 24));
}

function latestExperienceByEmployee(experiences) {
  const map = new Map();
  for (const row of experiences || []) {
    if (!row.employee_id) continue;
    const existing = map.get(row.employee_id);
    const rowDate = row.evaluation_date || "";
    const existingDate = existing?.evaluation_date || "";
    if (!existing || rowDate >= existingDate) map.set(row.employee_id, row);
  }
  return map;
}

function latestCompletedAdequacyByEmployee(adequacies) {
  const map = new Map();
  for (const row of adequacies || []) {
    if (row.adequacy_status !== "concluida" || !row.employee_id) continue;
    const existing = map.get(row.employee_id);
    const rowDate = row.last_update_date || "";
    const existingDate = existing?.last_update_date || "";
    if (!existing || rowDate >= existingDate) map.set(row.employee_id, row);
  }
  return map;
}

function resolveStage(employee, experience, adequacyByEmployee) {
  if (adequacyByEmployee.has(employee.id)) return PIPELINE_STAGES.ADEQUACAO_CONCLUIDA;
  if (experience?.conclusive_opinion === EXPERIENCE_OPINION_APPROVED) {
    return PIPELINE_STAGES.EXPERIENCIA_APROVADA;
  }
  return PIPELINE_STAGES.EM_EXPERIENCIA;
}

/**
 * @param {Array} selections
 * @param {Array} employees
 * @param {Array} experiences
 * @param {Array} adequacies
 */
export function buildPersonnelPipelineRows(selections, employees, experiences, adequacies) {
  const employeeBySelection = new Map();
  for (const e of employees || []) {
    if (e.source_selection_id) employeeBySelection.set(e.source_selection_id, e);
  }

  const experienceByEmployee = latestExperienceByEmployee(experiences);
  const adequacyByEmployee = latestCompletedAdequacyByEmployee(adequacies);

  const active = [];
  const completed = [];
  const rejected = [];
  const stageCounts = {
    aguardando_admissao: 0,
    em_experiencia: 0,
    experiencia_aprovada: 0,
    adequacao_concluida: 0,
  };

  for (const selection of selections || []) {
    if (selection.conclusive_opinion_approved === false) {
      rejected.push({ selection, employee: null, experience: null, reason: "selecao", periodEnd: null });
      continue;
    }
    if (selection.conclusive_opinion_approved !== true) continue;

    const employee = employeeBySelection.get(selection.id);
    if (!employee) {
      const row = {
        selection,
        employee: null,
        experience: null,
        adequacy: null,
        stage: PIPELINE_STAGES.AGUARDANDO_ADMISSAO,
        periodEnd: null,
        daysRemaining: null,
      };
      active.push(row);
      stageCounts.aguardando_admissao += 1;
      continue;
    }

    const experience = experienceByEmployee.get(employee.id) || null;
    const periodEnd = resolveExperiencePeriodEndDate(
      employee.admission_date,
      experience?.period_end_date,
    );

    if (experience?.conclusive_opinion === EXPERIENCE_OPINION_REJECTED) {
      rejected.push({
        selection,
        employee,
        experience,
        reason: "experiencia",
        periodEnd,
      });
      continue;
    }

    const adequacy = adequacyByEmployee.get(employee.id) || null;
    const stage = resolveStage(employee, experience, adequacyByEmployee);
    const row = {
      selection,
      employee,
      experience,
      adequacy,
      stage,
      periodEnd,
      daysRemaining: daysUntil(periodEnd),
    };
    stageCounts[stage] += 1;
    if (stage === PIPELINE_STAGES.ADEQUACAO_CONCLUIDA) {
      completed.push(row);
    } else {
      active.push(row);
    }
  }

  return { active, completed, rejected, stageCounts };
}

export async function fetchPersonnelPipeline(tenantId) {
  assertSupabasePersonnel();
  if (!tenantId) {
    return buildPersonnelPipelineRows([], [], [], []);
  }

  const [selectionsRes, employeesRes, experiencesRes, adequaciesRes] = await Promise.all([
    supabase
      .from("personnel_selections")
      .select("id, candidate_name, selection_date, vacancy, position_title, position_id, conclusive_opinion_approved")
      .eq("tenant_id", tenantId)
      .order("selection_date", { ascending: false }),
    supabase
      .from("employee_registrations")
      .select("id, full_name, admission_date, position_id, source_selection_id")
      .eq("tenant_id", tenantId),
    supabase
      .from("personnel_experience_evaluations")
      .select("id, employee_id, conclusive_opinion, period_end_date, admission_date, evaluation_date, occupant_name")
      .eq("tenant_id", tenantId),
    supabase
      .from("personnel_competency_adequacies")
      .select("id, employee_id, adequacy_status, last_update_date")
      .eq("tenant_id", tenantId),
  ]);

  if (selectionsRes.error) throw selectionsRes.error;
  if (employeesRes.error) throw employeesRes.error;
  if (experiencesRes.error) throw experiencesRes.error;
  if (adequaciesRes.error) throw adequaciesRes.error;

  return buildPersonnelPipelineRows(
    selectionsRes.data,
    employeesRes.data,
    experiencesRes.data,
    adequaciesRes.data,
  );
}
