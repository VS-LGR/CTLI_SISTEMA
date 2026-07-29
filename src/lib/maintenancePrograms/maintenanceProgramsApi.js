import { supabase } from "@/lib/supabaseClient";
import { isSupabaseAuthMode } from "@/lib/api";
import { equipmentKindLabel } from "@/lib/equipmentVerifications/verificationChecklist";

export const QUARTER_LABELS = ["1º Trimestre", "2º Trimestre", "3º Trimestre", "4º Trimestre"];

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
    events: (p.equipment_maintenance_events || []).sort((a, b) => a.quarter - b.quarter || String(a.asset_label).localeCompare(b.asset_label)),
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

export async function upsertMaintenanceEvent(payload) {
  if (payload.id) {
    const { id, ...rest } = payload;
    const { data, error } = await supabase
      .from("equipment_maintenance_events")
      .update(rest)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return data;
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
  if (!event.planned_date) return false;
  return String(event.planned_date).slice(0, 10) < todayIso;
}
