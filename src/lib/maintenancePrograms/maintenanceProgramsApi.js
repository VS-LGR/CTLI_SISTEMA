import { supabase } from "@/lib/supabaseClient";
import { isSupabaseAuthMode } from "@/lib/api";
import {
  EQUIPMENT_VERIFICATION_KINDS,
  equipmentKindLabel,
} from "@/lib/equipmentVerifications/verificationChecklist";

export const MONTH_SHORT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
export const MONTH_KEYS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

/** Meses padrão do ciclo trimestral no Excel RE-6.4.12A (Fev / Jun / Out). */
export const DEFAULT_PLANNED_MONTHS = [2, 6, 10];

export const DEFAULT_MAINTENANCE_ROWS = EQUIPMENT_VERIFICATION_KINDS.map((k) => ({
  kind: k.value,
  assetKey: k.value,
  label: defaultAssetLabel(k.value),
}));

export function defaultAssetLabel(kind) {
  switch (kind) {
    case "pesos":
      return "Conjuntos de Pesos Padrão";
    case "thermo":
      return "Thermo-Baro-Higrômetro";
    case "computador":
      return "Computadores";
    case "veiculo":
      return "Veículos utilizados no transporte de pesos padrão";
    default:
      return equipmentKindLabel(kind);
  }
}

export function quarterFromMonth(month) {
  const m = Number(month);
  if (m <= 3) return 1;
  if (m <= 6) return 2;
  if (m <= 9) return 3;
  return 4;
}

export function markSymbol(status) {
  if (status === "executado") return "OK";
  if (status === "planejado") return "Plan.";
  return "";
}

export function markLabel(status) {
  if (status === "executado") return "Executado";
  if (status === "planejado") return "Planejado";
  return "Sem marcação";
}

export function nextMarkStatus(current) {
  if (current === "planejado") return "executado";
  if (current === "executado") return null;
  return "planejado";
}

/**
 * Linhas da grelha anual: 4 tipos padrão + eventos customizados do ano.
 */
export function buildMaintenanceScheduleRows({ programs = [] } = {}) {
  const byKind = Object.fromEntries((programs || []).map((p) => [p.equipment_kind, p]));
  const rows = DEFAULT_MAINTENANCE_ROWS.map((def) => {
    const prog = byKind[def.kind];
    const events = prog?.events || [];
    const label = events[0]?.asset_label || def.label;
    const marks = {};
    for (const ev of events) {
      const m = Number(ev.month);
      if (m >= 1 && m <= 12) marks[m] = ev.status === "executado" ? "executado" : "planejado";
    }
    return {
      kind: def.kind,
      assetKey: def.assetKey,
      label,
      programId: prog?.id || null,
      marks,
      events,
    };
  });

  return {
    rows,
    issuedApprovedBy: programs.find((p) => p.issued_approved_by)?.issued_approved_by || "",
    updatedAt: programs.reduce((max, p) => {
      const iso = p.updated_at || null;
      if (iso && (!max || iso > max)) return iso;
      for (const ev of p.events || []) {
        const eIso = ev.updated_at;
        if (eIso && (!max || eIso > max)) max = eIso;
      }
      return max;
    }, null),
  };
}

export async function listMaintenancePrograms(tenantId, year) {
  if (!tenantId || !isSupabaseAuthMode) return [];
  let q = supabase
    .from("equipment_maintenance_programs")
    .select("*, equipment_maintenance_events(*)")
    .eq("tenant_id", tenantId)
    .order("equipment_kind");
  if (year) q = q.eq("year", year);
  const { data, error } = await q;
  if (error) throw error;
  return (data || []).map((p) => ({
    ...p,
    events: (p.equipment_maintenance_events || []).sort(
      (a, b) => (a.month || 0) - (b.month || 0) || String(a.asset_label).localeCompare(String(b.asset_label)),
    ),
    kindLabel: equipmentKindLabel(p.equipment_kind),
  }));
}

export async function ensureMaintenanceProgram(tenantId, year, equipmentKind) {
  const { data: existing } = await supabase
    .from("equipment_maintenance_programs")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("year", year)
    .eq("equipment_kind", equipmentKind)
    .maybeSingle();
  if (existing) return existing;
  const { data, error } = await supabase
    .from("equipment_maintenance_programs")
    .insert({ tenant_id: tenantId, year, equipment_kind: equipmentKind })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

/** Garante os 4 programas do ano e, se vazios, semeia planejado nos meses padrão. */
export async function ensureYearMaintenancePrograms(tenantId, year, { seedDefaults = true } = {}) {
  const programs = [];
  for (const def of DEFAULT_MAINTENANCE_ROWS) {
    const prog = await ensureMaintenanceProgram(tenantId, year, def.kind);
    programs.push(prog);
  }
  if (!seedDefaults) return listMaintenancePrograms(tenantId, year);

  const list = await listMaintenancePrograms(tenantId, year);
  for (const prog of list) {
    if ((prog.events || []).length) continue;
    const label = defaultAssetLabel(prog.equipment_kind);
    const rows = DEFAULT_PLANNED_MONTHS.map((month) => ({
      program_id: prog.id,
      tenant_id: tenantId,
      asset_label: label,
      month,
      quarter: quarterFromMonth(month),
      frequency: "trimestral",
      status: "planejado",
    }));
    const { error } = await supabase.from("equipment_maintenance_events").insert(rows);
    if (error) throw error;
  }
  return listMaintenancePrograms(tenantId, year);
}

export async function upsertMaintenanceMark({
  tenantId,
  year,
  kind,
  assetLabel,
  month,
  status,
}) {
  if (!tenantId || !isSupabaseAuthMode) throw new Error("Supabase necessário");
  const prog = await ensureMaintenanceProgram(tenantId, year, kind);
  const label = (assetLabel || defaultAssetLabel(kind)).trim();

  const { data: existing } = await supabase
    .from("equipment_maintenance_events")
    .select("*")
    .eq("program_id", prog.id)
    .eq("asset_label", label)
    .eq("month", month)
    .maybeSingle();

  if (!status) {
    if (existing) {
      const { error } = await supabase.from("equipment_maintenance_events").delete().eq("id", existing.id);
      if (error) throw error;
    }
    return { program: prog, event: null };
  }

  const payload = {
    program_id: prog.id,
    tenant_id: tenantId,
    asset_label: label,
    month,
    quarter: quarterFromMonth(month),
    frequency: "trimestral",
    status,
    planned_date: status === "planejado" ? `${year}-${String(month).padStart(2, "0")}-01` : existing?.planned_date || null,
    executed_date: status === "executado" ? `${year}-${String(month).padStart(2, "0")}-01` : null,
  };

  if (existing) {
    const { data, error } = await supabase
      .from("equipment_maintenance_events")
      .update(payload)
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error) throw error;
    return { program: prog, event: data };
  }

  const { data, error } = await supabase
    .from("equipment_maintenance_events")
    .insert(payload)
    .select("*")
    .single();
  if (error) throw error;
  return { program: prog, event: data };
}

export async function updateYearIssuedApprovedBy(tenantId, year, issuedApprovedBy) {
  const { error } = await supabase
    .from("equipment_maintenance_programs")
    .update({ issued_approved_by: String(issuedApprovedBy || "").trim() })
    .eq("tenant_id", tenantId)
    .eq("year", year);
  if (error) throw error;
}

export function isMaintenanceMarkOverdue(status, year, month, today = new Date()) {
  if (status === "executado" || !status) return false;
  const end = new Date(year, month, 0); // last day of month
  const todayIso = today.toISOString().slice(0, 10);
  return end.toISOString().slice(0, 10) < todayIso;
}

/** @deprecated — compat */
export const QUARTER_LABELS = ["1º Trimestre", "2º Trimestre", "3º Trimestre", "4º Trimestre"];
export async function upsertMaintenanceEvent(payload) {
  if (payload.id) {
    const { id, ...rest } = payload;
    if (rest.month != null && rest.quarter == null) rest.quarter = quarterFromMonth(rest.month);
    const { data, error } = await supabase
      .from("equipment_maintenance_events")
      .update(rest)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  }
  if (payload.month != null && payload.quarter == null) {
    payload = { ...payload, quarter: quarterFromMonth(payload.month) };
  }
  const { data, error } = await supabase
    .from("equipment_maintenance_events")
    .insert(payload)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}
export async function deleteMaintenanceEvent(id) {
  const { error } = await supabase.from("equipment_maintenance_events").delete().eq("id", id);
  if (error) throw error;
}
export function isMaintenanceEventOverdue(event, todayIso = new Date().toISOString().slice(0, 10)) {
  if (!event || event.status === "executado") return false;
  if (event.month && event.planned_date == null) {
    const y = new Date(todayIso).getFullYear();
    // best-effort without year on event
    return false;
  }
  if (!event.planned_date) return false;
  return String(event.planned_date).slice(0, 10) < todayIso;
}
