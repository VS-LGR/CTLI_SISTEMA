import { supabase } from "@/lib/supabaseClient";
import { isSupabaseAuthMode } from "@/lib/api";
import { roleLabel } from "@/lib/roles";

/** Campos rastreados na auditoria da Lista Mestra */
export const AUDITED_MASTER_DOCUMENT_FIELDS = [
  "code",
  "title",
  "type",
  "category",
  "reference",
  "current_revision",
  "current_issue_date",
  "previous_revision_date",
  "current_revision_date",
  "last_critical_analysis_date",
  "next_critical_analysis_date",
  "critical_analysis_period_months",
  "critical_analysis_result",
  "critical_analysis_notes",
  "status",
  "related_process",
  "department",
  "storage_location",
  "distribution_method",
  "protection_method",
  "copy_control",
  "access_level",
  "retention_time",
  "retention_unit",
  "disposition_after_retention",
  "file_naming_rule",
  "export_file_name_pattern",
  "template_key",
  "linked_module",
  "emission_responsible_id",
  "analysis_responsible_id",
  "approval_responsible_id",
  "quality_management_responsible_id",
  "is_obsolete",
  "obsolete_date",
  "obsolete_reason",
  "replaced_by_code",
  "retained_for_legal",
  "retained_for_knowledge",
  "obsolete_identification_applied",
  "obsolete_responsible_id",
  "notes",
];

function normalizeValue(value) {
  if (value === undefined) return null;
  if (value === "") return "";
  return value;
}

export function buildFieldChanges(before = {}, after = {}, fields = AUDITED_MASTER_DOCUMENT_FIELDS) {
  const changes = {};
  for (const field of fields) {
    const from = normalizeValue(before?.[field]);
    const to = normalizeValue(after?.[field]);
    if (JSON.stringify(from) !== JSON.stringify(to)) {
      changes[field] = { from: from ?? null, to: to ?? null };
    }
  }
  return changes;
}

export function summarizeChanges(action, changes = {}, fallback = "") {
  const keys = Object.keys(changes);
  if (fallback) return fallback;
  if (!keys.length) return action || "alteração";
  if (keys.length === 1) {
    const k = keys[0];
    return `${k}: ${formatChangeValue(changes[k].from)} → ${formatChangeValue(changes[k].to)}`;
  }
  return `${keys.length} campos alterados (${keys.slice(0, 4).join(", ")}${keys.length > 4 ? "…" : ""})`;
}

function formatChangeValue(v) {
  if (v == null || v === "") return "—";
  if (typeof v === "boolean") return v ? "sim" : "não";
  return String(v);
}

async function resolveActorContext() {
  if (!isSupabaseAuthMode) {
    return {
      user_id: null,
      user_email: "",
      user_full_name: "",
      user_role: "",
      user_function: "",
    };
  }

  const { data: authData } = await supabase.auth.getUser();
  const user = authData?.user;
  if (!user) {
    return {
      user_id: null,
      user_email: "",
      user_full_name: "",
      user_role: "",
      user_function: "",
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, employee_registration_id")
    .eq("id", user.id)
    .maybeSingle();

  let userFunction = "";
  if (profile?.employee_registration_id) {
    const { data: emp } = await supabase
      .from("employee_registrations")
      .select("job_role")
      .eq("id", profile.employee_registration_id)
      .maybeSingle();
    userFunction = emp?.job_role || "";
  }

  const role = profile?.role || "";
  return {
    user_id: user.id,
    user_email: profile?.email || user.email || "",
    user_full_name: profile?.full_name || "",
    user_role: role,
    user_function: userFunction || roleLabel(role) || role || "",
  };
}

/**
 * Regista uma alteração na Lista Mestra (conta, nome, função, diff).
 */
export async function recordMasterDocumentChange({
  tenantId,
  masterDocumentId = null,
  action = "update",
  changes = {},
  summary = "",
  before = null,
  after = null,
  fields = AUDITED_MASTER_DOCUMENT_FIELDS,
}) {
  if (!tenantId || !isSupabaseAuthMode) return null;

  const computed = before != null || after != null
    ? buildFieldChanges(before || {}, after || {}, fields)
    : changes;
  const keys = Object.keys(computed || {});
  if (!keys.length && action === "update") return null;

  const actor = await resolveActorContext();
  const row = {
    tenant_id: tenantId,
    master_document_id: masterDocumentId || null,
    action,
    changes: computed || {},
    summary: summarizeChanges(action, computed, summary),
    ...actor,
  };

  const { data, error } = await supabase
    .from("master_document_change_logs")
    .insert(row)
    .select()
    .single();

  if (error) {
    console.warn("[masterDocumentChangeLog] falha ao registar:", error.message);
    return null;
  }
  return data;
}

export async function listMasterDocumentChangeLogs(tenantId, filters = {}) {
  if (!tenantId || !isSupabaseAuthMode) return [];
  let q = supabase
    .from("master_document_change_logs")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (filters.masterDocumentId) q = q.eq("master_document_id", filters.masterDocumentId);
  if (filters.action) q = q.eq("action", filters.action);
  if (filters.limit) q = q.limit(filters.limit);
  else q = q.limit(200);

  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}
