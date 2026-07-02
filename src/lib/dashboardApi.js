/**
 * Dashboard — mock (mockBackend.js), API legada (REACT_APP_BACKEND_URL) ou Supabase (lembretes).
 */

import api, { isMockApiMode, isSupabaseAuthMode } from "@/lib/api";
import { supabase } from "@/lib/supabaseClient";
import { REQ_NAMES } from "@/lib/requirementNavConfig";
import {
  fetchDocumentStatsSupabase,
  isSupabaseDocumentsEnabled,
  toggleDocumentPin as toggleDocumentPinApi,
} from "@/lib/documentsApi";
import { getAllDocumentAlerts } from "@/lib/masterDocuments/masterDocumentAlerts";
import { LISTA_MESTRA_PATH } from "@/lib/masterDocuments/masterDocumentRoutes";
import {
  DASHBOARD_CERTIFICATE_STATUSES,
  buildEquipmentExpiryAlerts,
  countFromSupabaseHead,
} from "@/lib/dashboardPortalMetrics";

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

function buildDashboardFromDocs(docs, reminders, documentAlerts = null) {
  const by_requirement = {};
  for (const req of ["4", "5", "6", "7", "8"]) {
    const sub = docs.filter((d) => String(d.requirement) === req);
    by_requirement[req] = {
      name: REQ_NAMES[req] || `Requisito ${req}`,
      procedimentos: sub.filter((d) => d.section === "procedimento" && d.status === "vigente").length,
      registros: sub.filter((d) => ["registro", "documento", "assinatura"].includes(d.section) && d.status === "vigente").length,
      obsoletos: sub.filter((d) => d.status === "obsoleto").length,
    };
  }
  const vigente = docs.filter((d) => d.status === "vigente").length;
  const obsoleto = docs.filter((d) => d.status === "obsoleto").length;
  const near = docs
    .filter((d) => d.review_date && d.status === "vigente")
    .sort((a, b) => String(a.review_date).localeCompare(String(b.review_date)))
    .slice(0, 8);
  const recent = [...docs].sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at))).slice(0, 8);
  const pinned = docs.filter((d) => d.pinned_at).slice(0, 8);
  return {
    total_documents: docs.length,
    by_status: { vigente, obsoleto },
    near_review: near,
    by_requirement,
    recent_documents: recent.map((d) => ({
      id: d.id,
      title: d.title,
      requirement: d.requirement,
      section: d.section,
      status: d.status,
      version: d.version,
      responsible: d.responsible,
      updated_at: d.updated_at,
      created_at: d.created_at,
      pinned_at: d.pinned_at,
    })),
    pinned_documents: pinned.map((d) => ({
      id: d.id,
      title: d.title,
      requirement: d.requirement,
      section: d.section,
      status: d.status,
      version: d.version,
      responsible: d.responsible,
      updated_at: d.updated_at,
      created_at: d.created_at,
      pinned_at: d.pinned_at,
    })),
    reminders,
    document_alerts: documentAlerts,
    lista_mestra_path: LISTA_MESTRA_PATH,
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

async function countPendingApprovalCertificates(tenantId) {
  if (!supabase || !tenantId) return 0;
  const { count, error } = await supabase
    .from("calibration_certificates")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("status", "aguardando_aprovacao");
  if (error) return 0;
  return count || 0;
}

const EXPIRY_WARNING_DAYS = 60;

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

async function fetchPortalMetrics(tenantId) {
  if (!supabase || !tenantId) {
    return { certificates_issued_count: 0, proposals_issued_count: 0, equipment_expiry_alerts: [] };
  }

  const today = todayIsoDate();

  const [certRes, propRes, weightRes, envRes] = await Promise.all([
    supabase
      .from("calibration_certificates")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .in("status", DASHBOARD_CERTIFICATE_STATUSES),
    supabase
      .from("commercial_proposals")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId),
    supabase
      .from("weight_standard_certificates")
      .select("id, set_name, certificate_number, expiry_date")
      .eq("tenant_id", tenantId),
    supabase
      .from("environment_sensor_certificates")
      .select("id, equipment_name, certificate_number, expiry_date")
      .eq("tenant_id", tenantId),
  ]);

  const certificates_issued_count = countFromSupabaseHead(certRes);
  const proposals_issued_count = countFromSupabaseHead(propRes);

  if (weightRes.error) throw weightRes.error;
  if (envRes.error) throw envRes.error;

  const equipment_expiry_alerts = buildEquipmentExpiryAlerts(
    weightRes.data || [],
    envRes.data || [],
    today,
    EXPIRY_WARNING_DAYS,
  );

  return {
    certificates_issued_count,
    proposals_issued_count,
    equipment_expiry_alerts,
  };
}

async function enrichDashboardPayload(tenantId, base) {
  let certificate_pending_approval = 0;
  let portal = { certificates_issued_count: 0, proposals_issued_count: 0, equipment_expiry_alerts: [] };
  try {
    certificate_pending_approval = await countPendingApprovalCertificates(tenantId);
  } catch { /* optional */ }
  try {
    portal = await fetchPortalMetrics(tenantId);
  } catch (err) {
    console.warn("[dashboard] métricas operacionais indisponíveis:", err?.message || err);
  }
  return {
    ...base,
    certificate_pending_approval,
    ...portal,
  };
}

export function fetchDashboard(tenantId) {
  if (isSupabaseAuthMode) {
    return listRemindersSupabase(tenantId).then(async (reminders) => {
      if (isSupabaseDocumentsEnabled()) {
        try {
          const docs = await fetchDocumentStatsSupabase(tenantId);
          let documentAlerts = null;
          try {
            documentAlerts = await getAllDocumentAlerts(tenantId);
          } catch { /* optional */ }
          const data = await enrichDashboardPayload(
            tenantId,
            buildDashboardFromDocs(docs, reminders, documentAlerts),
          );
          return { data };
        } catch {
          const data = await enrichDashboardPayload(tenantId, emptyDashboardPayload(reminders));
          return { data };
        }
      }
      if (hasLegacyDashboardApi) {
        try {
          const r = await api.get("/dashboard", { params: { tenant_id: tenantId } });
          const data = await enrichDashboardPayload(tenantId, { ...r.data, reminders });
          return { data };
        } catch {
          const data = await enrichDashboardPayload(tenantId, emptyDashboardPayload(reminders));
          return { data };
        }
      }
      const data = await enrichDashboardPayload(tenantId, emptyDashboardPayload(reminders));
      return { data };
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

export function toggleDocumentPin(documentId, pinned, userId) {
  if (isSupabaseDocumentsEnabled()) return toggleDocumentPinApi(documentId, pinned, userId);
  return api.put(`/documents/${documentId}`, { pinned });
}
