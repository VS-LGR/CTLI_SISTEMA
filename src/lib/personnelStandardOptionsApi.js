import { supabase } from "@/lib/supabaseClient";
import { isSupabaseAuthMode } from "@/lib/api";
import { PERSONNEL_DEFAULT_OPTIONS } from "@/lib/personnelConstants";

export function assertSupabasePersonnel() {
  if (!isSupabaseAuthMode) throw new Error("Módulo Pessoal requer ligação Supabase.");
}

export async function listStandardOptions(tenantId, { category = null, activeOnly = true } = {}) {
  assertSupabasePersonnel();
  let q = supabase
    .from("personnel_standard_options")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("category")
    .order("sort_order")
    .order("label");
  if (category) q = q.eq("category", category);
  if (activeOnly) q = q.eq("is_active", true);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function ensureStandardOptionsSeeded(tenantId) {
  assertSupabasePersonnel();
  const existing = await listStandardOptions(tenantId, { activeOnly: false });
  if (existing.length > 0) return existing;

  const rows = [];
  let sort = 0;
  for (const [category, labels] of Object.entries(PERSONNEL_DEFAULT_OPTIONS)) {
    labels.forEach((label, i) => {
      rows.push({
        tenant_id: tenantId,
        category,
        label,
        description: "",
        sort_order: i,
        is_active: true,
      });
    });
    sort += labels.length;
  }
  const { data, error } = await supabase.from("personnel_standard_options").insert(rows).select();
  if (error) throw error;
  return data || [];
}

export async function loadOptionsByCategory(tenantId) {
  const rows = await ensureStandardOptionsSeeded(tenantId);
  const map = {};
  for (const row of rows) {
    if (!map[row.category]) map[row.category] = [];
    if (row.is_active) map[row.category].push(row);
  }
  return map;
}

export async function createStandardOption(tenantId, payload) {
  assertSupabasePersonnel();
  const { data, error } = await supabase
    .from("personnel_standard_options")
    .insert({
      tenant_id: tenantId,
      category: payload.category,
      label: payload.label.trim(),
      description: (payload.description || "").trim(),
      sort_order: payload.sort_order ?? 999,
      is_active: payload.is_active !== false,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateStandardOption(id, payload) {
  assertSupabasePersonnel();
  const { data, error } = await supabase
    .from("personnel_standard_options")
    .update({
      label: payload.label?.trim(),
      description: payload.description?.trim(),
      sort_order: payload.sort_order,
      is_active: payload.is_active,
    })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteStandardOption(id) {
  assertSupabasePersonnel();
  const { error } = await supabase.from("personnel_standard_options").delete().eq("id", id);
  if (error) throw error;
}
