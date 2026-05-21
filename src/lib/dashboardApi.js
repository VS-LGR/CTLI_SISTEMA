/**
 * Dashboard — mock (mockBackend.js), API legada (REACT_APP_BACKEND_URL) ou Supabase (lembretes).
 */

import api, { isMockApiMode, isSupabaseAuthMode } from "@/lib/api";
import { supabase } from "@/lib/supabaseClient";
import { REQ_NAMES } from "@/lib/requirementNavConfig";

const BACKEND_URL = (process.env.REACT_APP_BACKEND_URL || "").trim();
const hasLegacyDashboardApi = Boolean(BACKEND_URL) && !isMockApiMode;

function mapReminderRow(r) {
  return {
    id: r.id,
    tenant_id: r.tenant_id,
    text: r.text,
    created_by_id: r.created_by,
    created_by_name: r.created_by_name,
    created_at: r.created_at,
  };
}

function emptyDashboardPayload(reminders) {
  const by_requirement = {};
  for (const req of ["4", "5", "6", "7", "8"]) {
    by_requirement[req] = {
      name: REQ_NAMES[req] || `Requisito ${req}`,
      procedimentos: 0,
      registros: 0,
      obsoletos: 0,
    };
  }
  return {
    total_documents: 0,
    by_status: { vigente: 0, obsoleto: 0 },
    near_review: [],
    by_requirement,
    recent_documents: [],
    pinned_documents: [],
    reminders,
  };
}

async function listRemindersSupabase(tenantId) {
  if (!supabase) throw new Error("Supabase não configurado");
  const { data, error } = await supabase
    .from("dashboard_reminders")
    .select("id, tenant_id, text, created_by, created_by_name, created_at")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(mapReminderRow);
}

export function fetchDashboard(tenantId) {
  if (isSupabaseAuthMode) {
    return listRemindersSupabase(tenantId).then(async (reminders) => {
      if (hasLegacyDashboardApi) {
        try {
          const r = await api.get("/dashboard", { params: { tenant_id: tenantId } });
          return { data: { ...r.data, reminders } };
        } catch {
          return { data: emptyDashboardPayload(reminders) };
        }
      }
      return { data: emptyDashboardPayload(reminders) };
    });
  }
  return api.get("/dashboard", { params: { tenant_id: tenantId } });
}

export function addDashboardReminder(tenantId, text) {
  if (isSupabaseAuthMode) {
    return (async () => {
      if (!supabase) throw new Error("Supabase não configurado");
      const { data: { user }, error: authErr } = await supabase.auth.getUser();
      if (authErr || !user) throw new Error("Não autenticado");

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", user.id)
        .maybeSingle();

      const created_by_name = profile?.full_name || profile?.email || "Utilizador";

      const { data, error } = await supabase
        .from("dashboard_reminders")
        .insert({
          tenant_id: tenantId,
          text: String(text).trim(),
          created_by: user.id,
          created_by_name,
        })
        .select("id, tenant_id, text, created_by, created_by_name, created_at")
        .single();

      if (error) throw error;
      return { data: mapReminderRow(data) };
    })();
  }
  return api.post("/dashboard/reminders", { tenant_id: tenantId, text });
}

export function deleteDashboardReminder(tenantId, reminderId) {
  if (isSupabaseAuthMode) {
    return (async () => {
      if (!supabase) throw new Error("Supabase não configurado");
      const { error } = await supabase
        .from("dashboard_reminders")
        .delete()
        .eq("id", reminderId)
        .eq("tenant_id", tenantId);
      if (error) throw error;
      return { data: { ok: true } };
    })();
  }
  return api.delete(`/dashboard/reminders/${reminderId}`, { params: { tenant_id: tenantId } });
}

export function toggleDocumentPin(documentId, pinned) {
  return api.put(`/documents/${documentId}`, { pinned });
}
