import { supabase } from "@/lib/supabaseClient";
import { isSupabaseAuthMode } from "@/lib/api";
import { clearMasterDocumentCache } from "./masterDocumentResolver";
import { calculateNextCriticalAnalysisDate } from "./masterDocumentResolver";
import { calculateNextExternalConsultationDate } from "./masterDocumentResolver";

export function assertSupabaseMasterDocuments() {
  if (!isSupabaseAuthMode) {
    throw new Error("Lista Mestra requer ligação Supabase.");
  }
}

export async function listFileNamingRules() {
  assertSupabaseMasterDocuments();
  const { data, error } = await supabase
    .from("document_file_naming_rules")
    .select("*")
    .eq("is_active", true)
    .order("name");
  if (error) throw error;
  return data || [];
}

export async function listMasterDocuments(tenantId, filters = {}) {
  assertSupabaseMasterDocuments();
  let q = supabase
    .from("master_documents")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("code", { ascending: true });

  if (filters.type && filters.type !== "all") q = q.eq("type", filters.type);
  if (filters.category && filters.category !== "all") q = q.eq("category", filters.category);
  if (filters.status && filters.status !== "all") q = q.eq("status", filters.status);
  if (filters.linkedModule && filters.linkedModule !== "all") q = q.eq("linked_module", filters.linkedModule);
  if (filters.templateKey) q = q.eq("template_key", filters.templateKey);
  if (filters.search) q = q.or(`code.ilike.%${filters.search}%,title.ilike.%${filters.search}%`);
  if (filters.internalOnly) {
    q = q.not("type", "eq", "documento_externo");
  }
  if (filters.externalOnly) q = q.eq("type", "documento_externo");
  if (filters.criticalOverdue) {
    const today = new Date().toISOString().slice(0, 10);
    q = q.lt("next_critical_analysis_date", today);
  }

  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function getMasterDocument(tenantId, id) {
  assertSupabaseMasterDocuments();
  const { data, error } = await supabase
    .from("master_documents")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createMasterDocument(tenantId, payload) {
  assertSupabaseMasterDocuments();
  const row = {
    tenant_id: tenantId,
    ...payload,
    next_critical_analysis_date: calculateNextCriticalAnalysisDate(
      payload.last_critical_analysis_date || payload.current_issue_date,
      payload.critical_analysis_period_months || 24,
    ),
  };
  const { data, error } = await supabase
    .from("master_documents")
    .insert(row)
    .select()
    .single();
  if (error) throw error;
  clearMasterDocumentCache(tenantId);
  return data;
}

export async function updateMasterDocument(tenantId, id, payload) {
  assertSupabaseMasterDocuments();
  const updates = { ...payload };
  if (payload.last_critical_analysis_date !== undefined) {
    updates.next_critical_analysis_date = calculateNextCriticalAnalysisDate(
      payload.last_critical_analysis_date,
      payload.critical_analysis_period_months || 24,
    );
  }
  const { data, error } = await supabase
    .from("master_documents")
    .update(updates)
    .eq("tenant_id", tenantId)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  clearMasterDocumentCache(tenantId);
  return data;
}

export async function deleteMasterDocument(tenantId, id) {
  assertSupabaseMasterDocuments();
  const { error } = await supabase
    .from("master_documents")
    .delete()
    .eq("tenant_id", tenantId)
    .eq("id", id);
  if (error) throw error;
  clearMasterDocumentCache(tenantId);
}

export async function duplicateMasterDocument(tenantId, id) {
  const doc = await getMasterDocument(tenantId, id);
  if (!doc) throw new Error("Documento não encontrado");
  const { id: _id, created_at, updated_at, ...rest } = doc;
  return createMasterDocument(tenantId, {
    ...rest,
    code: doc.code ? `${doc.code}-copia` : "",
    title: `${doc.title} (cópia)`,
    status: "rascunho",
  });
}

export async function markDocumentObsolete(tenantId, id, obsoleteData) {
  return updateMasterDocument(tenantId, id, {
    status: obsoleteData.retained_for_legal || obsoleteData.retained_for_knowledge
      ? "retido_como_obsoleto"
      : "obsoleto",
    is_obsolete: true,
    obsolete_date: obsoleteData.obsolete_date || new Date().toISOString().slice(0, 10),
    obsolete_reason: obsoleteData.obsolete_reason || "",
    replaced_by_code: obsoleteData.replaced_by_code || "",
    retained_for_legal: !!obsoleteData.retained_for_legal,
    retained_for_knowledge: !!obsoleteData.retained_for_knowledge,
    obsolete_identification_applied: !!obsoleteData.obsolete_identification_applied,
    obsolete_responsible_id: obsoleteData.obsolete_responsible_id || null,
  });
}

const REVISION_SELECT = `
  *,
  approved_by:approved_by_id(id, name),
  changed_by:changed_by_id(id, name),
  reviewed_by:reviewed_by_id(id, name)
`;

// Revisões
export async function listDocumentRevisions(tenantId, masterDocumentId) {
  assertSupabaseMasterDocuments();
  const { data, error } = await supabase
    .from("document_revisions")
    .select(REVISION_SELECT)
    .eq("tenant_id", tenantId)
    .eq("master_document_id", masterDocumentId)
    .order("revision_number", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function listAllRevisions(tenantId) {
  assertSupabaseMasterDocuments();
  const { data, error } = await supabase
    .from("document_revisions")
    .select(`${REVISION_SELECT}, master_document:master_document_id(code, title)`)
    .eq("tenant_id", tenantId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function listRevisionsForDocumentCode(tenantId, code) {
  assertSupabaseMasterDocuments();
  const doc = await findMasterDocumentByCode(tenantId, code);
  if (!doc) return [];
  const revisions = await listDocumentRevisions(tenantId, doc.id);
  return revisions.sort((a, b) => String(a.revision_number).localeCompare(String(b.revision_number), undefined, { numeric: true }));
}

export function revisionResponsibleName(revision) {
  return revision?.approved_by?.name
    || revision?.changed_by?.name
    || revision?.notes
    || "—";
}

export async function createDocumentRevision(tenantId, masterDocumentId, payload) {
  assertSupabaseMasterDocuments();
  const { data, error } = await supabase
    .from("document_revisions")
    .insert({ tenant_id: tenantId, master_document_id: masterDocumentId, ...payload })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function approveDocumentRevision(revisionId, approvedById = null) {
  assertSupabaseMasterDocuments();
  if (approvedById) {
    const { error: updateError } = await supabase
      .from("document_revisions")
      .update({ approved_by_id: approvedById })
      .eq("id", revisionId);
    if (updateError) throw updateError;
  }
  const { error } = await supabase.rpc("approve_document_revision", { p_revision_id: revisionId });
  if (error) throw error;
  const { data: rev } = await supabase
    .from("document_revisions")
    .select("tenant_id")
    .eq("id", revisionId)
    .maybeSingle();
  if (rev?.tenant_id) clearMasterDocumentCache(rev.tenant_id);
}

export async function recordCriticalAnalysis(tenantId, masterDocumentId, payload) {
  assertSupabaseMasterDocuments();
  const doc = await getMasterDocument(tenantId, masterDocumentId);
  if (!doc) throw new Error("Documento não encontrado");
  const period = doc.critical_analysis_period_months || 24;
  const analysisDate = payload.analysis_date || new Date().toISOString().slice(0, 10);
  return updateMasterDocument(tenantId, masterDocumentId, {
    last_critical_analysis_date: analysisDate,
    next_critical_analysis_date: calculateNextCriticalAnalysisDate(analysisDate, period),
    critical_analysis_result: payload.result || "",
    critical_analysis_notes: payload.notes || "",
    analysis_responsible_id: payload.responsible_id || null,
  });
}

export async function recordExternalConsultation(tenantId, externalId, payload) {
  assertSupabaseMasterDocuments();
  const { data: current, error: fetchError } = await supabase
    .from("external_document_controls")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("id", externalId)
    .maybeSingle();
  if (fetchError) throw fetchError;
  if (!current) throw new Error("Documento externo não encontrado");

  const consultationDate = payload.consultation_date || new Date().toISOString().slice(0, 10);
  const period = current.consultation_period_months || 6;
  const updates = {
    previous_consultation_date: current.last_consultation_date || current.previous_consultation_date,
    last_consultation_date: consultationDate,
    next_consultation_date: calculateNextExternalConsultationDate(consultationDate, period),
    validity_status: payload.validity_status || current.validity_status || "valido",
    notes: payload.notes != null ? payload.notes : current.notes,
  };
  if (payload.has_revision != null) updates.has_revision = payload.has_revision;
  if (payload.external_revision != null) updates.external_revision = payload.external_revision;

  const { data, error } = await supabase
    .from("external_document_controls")
    .update(updates)
    .eq("tenant_id", tenantId)
    .eq("id", externalId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function markRevisionAsObsolete(tenantId, revisionId) {
  assertSupabaseMasterDocuments();
  const { data, error } = await supabase
    .from("document_revisions")
    .update({ status: "obsoleta" })
    .eq("tenant_id", tenantId)
    .eq("id", revisionId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Distribuição
export async function listDocumentDistributions(tenantId, masterDocumentId) {
  assertSupabaseMasterDocuments();
  let q = supabase
    .from("document_distributions")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("distribution_date", { ascending: false });
  if (masterDocumentId) q = q.eq("master_document_id", masterDocumentId);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function saveDocumentDistribution(tenantId, payload) {
  assertSupabaseMasterDocuments();
  if (payload.id) {
    const { data, error } = await supabase
      .from("document_distributions")
      .update(payload)
      .eq("tenant_id", tenantId)
      .eq("id", payload.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await supabase
    .from("document_distributions")
    .insert({ tenant_id: tenantId, ...payload })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteDocumentDistribution(tenantId, id) {
  assertSupabaseMasterDocuments();
  const { error } = await supabase
    .from("document_distributions")
    .delete()
    .eq("tenant_id", tenantId)
    .eq("id", id);
  if (error) throw error;
}

// Templates
export async function listDocumentTemplateLinks(tenantId, masterDocumentId) {
  assertSupabaseMasterDocuments();
  let q = supabase
    .from("document_template_links")
    .select("*, master_document:master_document_id(code, title)")
    .eq("tenant_id", tenantId);
  if (masterDocumentId) q = q.eq("master_document_id", masterDocumentId);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function saveDocumentTemplateLink(tenantId, payload) {
  assertSupabaseMasterDocuments();
  if (payload.id) {
    const { data, error } = await supabase
      .from("document_template_links")
      .update(payload)
      .eq("tenant_id", tenantId)
      .eq("id", payload.id)
      .select()
      .single();
    if (error) throw error;
    clearMasterDocumentCache(tenantId);
    return data;
  }
  const { data, error } = await supabase
    .from("document_template_links")
    .insert({ tenant_id: tenantId, ...payload })
    .select()
    .single();
  if (error) throw error;
  clearMasterDocumentCache(tenantId);
  return data;
}

// Externos
export async function listExternalDocuments(tenantId) {
  assertSupabaseMasterDocuments();
  const { data, error } = await supabase
    .from("external_document_controls")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("title");
  if (error) throw error;
  return data || [];
}

export async function saveExternalDocument(tenantId, payload) {
  assertSupabaseMasterDocuments();
  const row = {
    ...payload,
    next_consultation_date: calculateNextExternalConsultationDate(
      payload.last_consultation_date,
      payload.consultation_period_months || 6,
    ),
  };
  if (payload.id) {
    const { data, error } = await supabase
      .from("external_document_controls")
      .update(row)
      .eq("tenant_id", tenantId)
      .eq("id", payload.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await supabase
    .from("external_document_controls")
    .insert({ tenant_id: tenantId, ...row })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteExternalDocument(tenantId, id) {
  assertSupabaseMasterDocuments();
  const { error } = await supabase
    .from("external_document_controls")
    .delete()
    .eq("tenant_id", tenantId)
    .eq("id", id);
  if (error) throw error;
}

// Software controlado
export async function listControlledSoftware(tenantId) {
  assertSupabaseMasterDocuments();
  const { data, error } = await supabase
    .from("controlled_software")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("title");
  if (error) throw error;
  return data || [];
}

export async function saveControlledSoftware(tenantId, payload) {
  assertSupabaseMasterDocuments();
  if (payload.id) {
    const { data, error } = await supabase
      .from("controlled_software")
      .update(payload)
      .eq("tenant_id", tenantId)
      .eq("id", payload.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await supabase
    .from("controlled_software")
    .insert({ tenant_id: tenantId, ...payload })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteControlledSoftware(tenantId, id) {
  assertSupabaseMasterDocuments();
  const { error } = await supabase
    .from("controlled_software")
    .delete()
    .eq("tenant_id", tenantId)
    .eq("id", id);
  if (error) throw error;
}

// Snapshots
export async function listGeneratedSnapshots(tenantId, filters = {}) {
  assertSupabaseMasterDocuments();
  let q = supabase
    .from("document_generated_snapshots")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("generated_at", { ascending: false });
  if (filters.masterDocumentId) q = q.eq("master_document_id", filters.masterDocumentId);
  if (filters.sourceModule) q = q.eq("source_module", filters.sourceModule);
  const { data, error } = await q.limit(filters.limit || 200);
  if (error) throw error;
  return data || [];
}

// Seed
export async function seedMasterDocumentsForTenant(tenantId) {
  assertSupabaseMasterDocuments();
  const { error } = await supabase.rpc("seed_master_documents_for_tenant", { p_tenant_id: tenantId });
  if (error) throw error;
  const { error: weightErr } = await supabase.rpc("ensure_weight_calibration_master_documents", {
    p_tenant_id: tenantId,
  });
  if (weightErr) throw weightErr;
  clearMasterDocumentCache(tenantId);
}

export async function findMasterDocumentByCode(tenantId, code) {
  if (!code) return null;
  const list = await listMasterDocuments(tenantId, { search: code });
  return list.find((d) => d.code === code) || null;
}
