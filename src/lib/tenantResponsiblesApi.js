import api, { asArray, isSupabaseAuthMode } from "@/lib/api";
import { supabase } from "@/lib/supabaseClient";

export async function loadTenantResponsibles(tenantId) {
  if (!tenantId) return [];
  if (isSupabaseAuthMode) {
    const { data, error } = await supabase
      .from("responsibles")
      .select("id, name, role, email")
      .eq("tenant_id", tenantId)
      .order("name");
    if (error) throw error;
    return data ?? [];
  }
  const r = await api.get(`/tenants/${tenantId}/responsibles`);
  return asArray(r.data);
}
