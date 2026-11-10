import { supabase } from "@/lib/supabaseClient";
import { isSupabaseAuthMode } from "@/lib/api";
import { inferProcedureCodeFromFolder } from "@/lib/masterDocuments/masterDocumentRoutes";
import {
  planMasterSync,
  revisionFromVersion,
} from "@/lib/documents/documentUploadPlan";
import {
  approveDocumentRevision,
  createDocumentRevision,
  createMasterDocument,
  findMasterDocumentByCode,
  getMasterDocument,
  updateMasterDocument,
} from "@/lib/masterDocuments/masterDocumentsApi";

const SYNC_SECTIONS = new Set(["procedimento", "registro", "documento"]);

const SKIP_FOLDER_SECTIONS = new Set([
  "propostas_comerciais",
  "pedidos_compra",
  "solicitacoes_orcamento",
]);

function mapSectionToMasterType(section) {
  if (section === "documento") return "documento_interno";
  if (section === "procedimento" || section === "registro") return section;
  return "documento_interno";
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function resolveDocumentCode(tenantDoc) {
  const explicit = (tenantDoc?.code || "").trim();
  if (explicit) return explicit;
  return inferProcedureCodeFromFolder(tenantDoc?.folder_key) || "";
}

export function shouldSyncTenantDocumentToMasterList(tenantDoc) {
  if (!tenantDoc?.tenant_id) return false;
  if (!SYNC_SECTIONS.has(tenantDoc.section)) return false;
  if (SKIP_FOLDER_SECTIONS.has(tenantDoc.section)) return false;
  return true;
}

async function linkTenantDocumentMasterId(tenantDocId, masterDocumentId) {
  if (!tenantDocId || !masterDocumentId) return;
  await supabase
    .from("tenant_documents")
    .update({ master_document_id: masterDocumentId })
    .eq("id", tenantDocId);
}

async function ensureMasterDocument(tenantId, tenantDoc) {
  const code = resolveDocumentCode(tenantDoc);
  if (!code) return null;

  let masterDoc = null;
  if (tenantDoc.master_document_id) {
    masterDoc = await getMasterDocument(tenantId, tenantDoc.master_document_id);
  }
  if (!masterDoc && code) {
    masterDoc = await findMasterDocumentByCode(tenantId, code);
  }

  const issueDate = tenantDoc.review_date || todayIso();
  const revision = revisionFromVersion(tenantDoc.version);
  const becomesCurrent = tenantDoc.status === "vigente";

  if (!masterDoc) {
    masterDoc = await createMasterDocument(tenantId, {
      code,
      title: tenantDoc.title || code,
      type: mapSectionToMasterType(tenantDoc.section),
      reference: tenantDoc.folder_key ? inferProcedureCodeFromFolder(tenantDoc.folder_key) || "" : "",
      current_revision: becomesCurrent ? revision : "00",
      current_issue_date: issueDate,
      current_revision_date: issueDate,
      status: "ativo",
      linked_module: `req-${tenantDoc.requirement}`,
    });
  } else {
    masterDoc = await updateMasterDocument(tenantId, masterDoc.id, {
      title: tenantDoc.title || masterDoc.title,
      type: mapSectionToMasterType(tenantDoc.section),
    });
  }

  return masterDoc;
}

async function listRevisionsForNumber(masterDocId, revision) {
  const { data, error } = await supabase
    .from("document_revisions")
    .select("id, status, file_url, revision_number")
    .eq("master_document_id", masterDocId)
    .eq("revision_number", revision);
  if (error) throw error;
  return data || [];
}

async function setRevisionFileUrl(revisionId, fileUrl) {
  if (!revisionId || !fileUrl) return;
  const { error } = await supabase
    .from("document_revisions")
    .update({ file_url: fileUrl })
    .eq("id", revisionId);
  if (error) throw error;
}

async function applyRevisionPlan(tenantId, masterDoc, tenantDoc, plan) {
  if (!plan || plan.revision === "skip") return;
  const revision = revisionFromVersion(tenantDoc.version);
  const fileUrl = tenantDoc.storage_path || "";
  const issueDate = tenantDoc.review_date || todayIso();
  const existing = await listRevisionsForNumber(masterDoc.id, revision);
  const vigente = existing.find((row) => row.status === "vigente");
  const notes = `Sincronizado automaticamente do documento SGQ (${tenantDoc.id})`;

  if (plan.revision === "approve") {
    if (vigente) {
      await setRevisionFileUrl(vigente.id, fileUrl);
      return;
    }
    const rev = await createDocumentRevision(tenantId, masterDoc.id, {
      revision_number: revision,
      issue_date: issueDate,
      revision_date: issueDate,
      change_description: "Revisão vigente a partir do ficheiro importado",
      change_reason: "Importação de documento controlado",
      status: "rascunho",
      file_url: fileUrl,
      notes,
    });
    await approveDocumentRevision(rev.id);
    return;
  }

  if (plan.revision === "attach_file" || plan.revision === "keep_file") {
    if (vigente) {
      await setRevisionFileUrl(vigente.id, fileUrl);
      return;
    }
    if (!fileUrl) return;
    const sameFile = existing.find((row) => row.file_url === fileUrl);
    if (sameFile) return;
    const rev = await createDocumentRevision(tenantId, masterDoc.id, {
      revision_number: revision,
      issue_date: issueDate,
      revision_date: issueDate,
      change_description: plan.revision === "keep_file"
        ? "Ficheiro da revisão vigente conservado no histórico"
        : "Ficheiro associado à revisão vigente",
      change_reason: "Importação de documento controlado",
      status: plan.revision === "keep_file" ? "obsoleta" : "rascunho",
      file_url: fileUrl,
      notes,
    });
    if (plan.revision === "attach_file") await approveDocumentRevision(rev.id);
    return;
  }

  if (plan.revision === "archive") {
    if (!fileUrl) return;
    const sameFile = existing.find((row) => row.file_url === fileUrl && row.status === "obsoleta");
    if (sameFile) return;
    await createDocumentRevision(tenantId, masterDoc.id, {
      revision_number: revision,
      issue_date: issueDate,
      revision_date: issueDate,
      change_description: "Revisão anterior arquivada no histórico",
      change_reason: "Importação de revisão anterior à vigente",
      status: "obsoleta",
      file_url: fileUrl,
      notes,
    });
  }
}

export async function syncOnTenantDocumentCreate(tenantDoc) {
  if (!isSupabaseAuthMode || !shouldSyncTenantDocumentToMasterList(tenantDoc)) return null;
  try {
    const masterDoc = await ensureMasterDocument(tenantDoc.tenant_id, tenantDoc);
    if (!masterDoc?.id) return null;
    await linkTenantDocumentMasterId(tenantDoc.id, masterDoc.id);
    const plan = planMasterSync({
      tenantDoc,
      currentRevision: masterDoc.current_revision,
      isCreate: true,
    });
    await applyRevisionPlan(tenantDoc.tenant_id, masterDoc, tenantDoc, plan);
    return masterDoc;
  } catch (err) {
    console.warn("[syncTenantDocumentToMasterList] create failed:", err);
    return null;
  }
}

const TRACKED_FIELDS = ["title", "code", "version", "review_date", "content_html", "status"];

export async function syncOnTenantDocumentUpdate(tenantDoc, previousDoc = null) {
  if (!isSupabaseAuthMode || !shouldSyncTenantDocumentToMasterList(tenantDoc)) return null;
  if (!previousDoc) return syncOnTenantDocumentCreate(tenantDoc);

  const changed = TRACKED_FIELDS.some((f) => tenantDoc[f] !== previousDoc[f]);
  if (!changed) return null;

  try {
    const masterDoc = await ensureMasterDocument(tenantDoc.tenant_id, tenantDoc);
    if (!masterDoc?.id) return null;
    await linkTenantDocumentMasterId(tenantDoc.id, masterDoc.id);

    const plan = planMasterSync({
      tenantDoc,
      previousDoc,
      currentRevision: masterDoc.current_revision,
    });
    await applyRevisionPlan(tenantDoc.tenant_id, masterDoc, tenantDoc, plan);
    return masterDoc;
  } catch (err) {
    console.warn("[syncTenantDocumentToMasterList] update failed:", err);
    return null;
  }
}

export async function syncOnTenantDocumentDelete(tenantDoc) {
  if (!isSupabaseAuthMode || !tenantDoc?.tenant_id) return null;
  const { removeMasterDocumentIfOrphaned } = await import("./masterDocumentDeletion");
  const masterId = tenantDoc.master_document_id;
  if (masterId) {
    return removeMasterDocumentIfOrphaned(tenantDoc.tenant_id, masterId, { source: "sgq_delete" });
  }
  if (!shouldSyncTenantDocumentToMasterList(tenantDoc)) return null;
  const code = resolveDocumentCode(tenantDoc);
  if (!code) return null;
  const masterDoc = await findMasterDocumentByCode(tenantDoc.tenant_id, code);
  if (!masterDoc?.id) return null;
  return removeMasterDocumentIfOrphaned(tenantDoc.tenant_id, masterDoc.id, { source: "sgq_delete" });
}
