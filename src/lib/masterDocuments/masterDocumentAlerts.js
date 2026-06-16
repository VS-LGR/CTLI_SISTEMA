import { supabase } from "@/lib/supabaseClient";
import { isSupabaseAuthMode } from "@/lib/api";

const DAYS_WARNING = 30;

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.ceil((d - today) / (1000 * 60 * 60 * 24));
}

export async function checkCriticalAnalysisDueDates(tenantId) {
  if (!isSupabaseAuthMode || !tenantId) return { overdue: [], upcoming: [], pending: [] };
  const { data, error } = await supabase
    .from("master_documents")
    .select("id, code, title, next_critical_analysis_date, last_critical_analysis_date, status")
    .eq("tenant_id", tenantId)
    .in("status", ["ativo", "em_revisao"]);
  if (error) throw error;

  const overdue = [];
  const upcoming = [];
  const pending = [];
  for (const doc of data || []) {
    if (!doc.next_critical_analysis_date && !doc.last_critical_analysis_date) {
      pending.push({ ...doc, daysUntil: null });
      continue;
    }
    if (!doc.next_critical_analysis_date) {
      pending.push({ ...doc, daysUntil: null });
      continue;
    }
    const days = daysUntil(doc.next_critical_analysis_date);
    if (days == null) continue;
    const item = { ...doc, daysUntil: days };
    if (days < 0) overdue.push(item);
    else if (days <= DAYS_WARNING) upcoming.push(item);
  }
  return { overdue, upcoming, pending };
}

export async function checkExternalDocumentDueDates(tenantId) {
  if (!isSupabaseAuthMode || !tenantId) return { overdue: [], upcoming: [], pending: [] };
  const { data, error } = await supabase
    .from("external_document_controls")
    .select("id, title, next_consultation_date, last_consultation_date, validity_status")
    .eq("tenant_id", tenantId);
  if (error) throw error;

  const overdue = [];
  const upcoming = [];
  const pending = [];
  for (const doc of data || []) {
    if (!doc.last_consultation_date) {
      pending.push({ ...doc, daysUntil: null });
      continue;
    }
    const days = daysUntil(doc.next_consultation_date);
    if (days == null) {
      pending.push({ ...doc, daysUntil: null });
      continue;
    }
    const item = { ...doc, daysUntil: days };
    if (days < 0) overdue.push(item);
    else if (days <= DAYS_WARNING) upcoming.push(item);
  }
  return { overdue, upcoming, pending };
}

export async function checkSoftwareValidationDueDates(tenantId) {
  if (!isSupabaseAuthMode || !tenantId) return { overdue: [], missing: [] };
  const { data, error } = await supabase
    .from("controlled_software")
    .select("id, title, last_validation_date, status")
    .eq("tenant_id", tenantId)
    .eq("status", "ativo");
  if (error) throw error;

  const overdue = [];
  const missing = [];
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  for (const sw of data || []) {
    if (!sw.last_validation_date) {
      missing.push(sw);
      continue;
    }
    const d = new Date(sw.last_validation_date);
    if (d < oneYearAgo) overdue.push(sw);
  }
  return { overdue, missing };
}

export async function checkObsoleteActiveTemplates(tenantId) {
  if (!isSupabaseAuthMode || !tenantId) return [];
  const { data, error } = await supabase
    .from("master_documents")
    .select("id, code, title, template_key, status")
    .eq("tenant_id", tenantId)
    .neq("template_key", "")
    .in("status", ["obsoleto", "retido_como_obsoleto"]);
  if (error) throw error;

  const results = [];
  for (const doc of data || []) {
    const { data: links } = await supabase
      .from("document_template_links")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("master_document_id", doc.id)
      .eq("is_active", true)
      .limit(1);
    if (links?.length) results.push(doc);
  }
  return results;
}

export async function getAllDocumentAlerts(tenantId) {
  const [critical, external, software, obsoleteTemplates] = await Promise.all([
    checkCriticalAnalysisDueDates(tenantId),
    checkExternalDocumentDueDates(tenantId),
    checkSoftwareValidationDueDates(tenantId),
    checkObsoleteActiveTemplates(tenantId),
  ]);

  return {
    criticalAnalysisOverdue: critical.overdue,
    criticalAnalysisUpcoming: critical.upcoming,
    criticalAnalysisPending: critical.pending,
    externalConsultationOverdue: external.overdue,
    externalConsultationUpcoming: external.upcoming,
    externalConsultationPending: external.pending,
    softwareValidationOverdue: software.overdue,
    softwareValidationMissing: software.missing,
    obsoleteActiveTemplates: obsoleteTemplates,
    totalCount:
      critical.overdue.length + critical.upcoming.length + critical.pending.length
      + external.overdue.length + external.upcoming.length + external.pending.length
      + software.overdue.length + software.missing.length
      + obsoleteTemplates.length,
  };
}
