import { supabase } from "@/lib/supabaseClient";
import { isSupabaseAuthMode } from "@/lib/api";
import { inferProcedureCodeFromFolder } from "@/lib/masterDocuments/masterDocumentRoutes";
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

function revisionFromVersion(version) {
  const v = String(version || "1.0").trim();
  const major = v.split(".")[0];
  if (/^\d+$/.test(major)) return major.padStart(2, "0");
  return "00";
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

  if (!masterDoc) {
    masterDoc = await createMasterDocument(tenantId, {
      code,
      title: tenantDoc.title || code,
      type: mapSectionToMasterType(tenantDoc.section),
      reference: tenantDoc.folder_key ? inferProcedureCodeFromFolder(tenantDoc.folder_key) || "" : "",
      current_revision: revision,
      current_issue_date: issueDate,
      current_revision_date: issueDate,
      status: "ativo",
      linked_module: `req-${tenantDoc.requirement}`,
    });
  } else {
    masterDoc = await updateMasterDocument(tenantId, masterDoc.id, {
      title: tenantDoc.title || masterDoc.title,
      type: mapSectionToMasterType(tenantDoc.section),
      current_revision: revision,
      current_revision_date: issueDate,
      status: "ativo",
    });
  }

  return masterDoc;
}

async function createAndApproveRevision(tenantId, masterDocId, tenantDoc, { changeDescription, changeReason }) {
  const issueDate = tenantDoc.review_date || todayIso();
  const revision = revisionFromVersion(tenantDoc.version);
  const rev = await createDocumentRevision(tenantId, masterDocId, {
    revision_number: revision,
    issue_date: issueDate,
    revision_date: issueDate,
    change_description: changeDescription,
    change_reason: changeReason,
    status: "rascunho",
    notes: `Sincronizado automaticamente do documento SGQ (${tenantDoc.id})`,
  });
  await approveDocumentRevision(rev.id);
  return rev;
}

export async function syncOnTenantDocumentCreate(tenantDoc) {
  if (!isSupabaseAuthMode || !shouldSyncTenantDocumentToMasterList(tenantDoc)) return null;
  try {
    const masterDoc = await ensureMasterDocument(tenantDoc.tenant_id, tenantDoc);
    if (!masterDoc?.id) return null;
    await linkTenantDocumentMasterId(tenantDoc.id, masterDoc.id);
    await createAndApproveRevision(tenantDoc.tenant_id, masterDoc.id, tenantDoc, {
      changeDescription: "Emissão inicial — inclusão na Lista Mestra",
      changeReason: "Criação automática a partir do requisito SGQ",
    });
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

    const revLabel = revisionFromVersion(tenantDoc.version);
    await createAndApproveRevision(tenantDoc.tenant_id, masterDoc.id, tenantDoc, {
      changeDescription: `Alteração registrada — Rev. ${revLabel}`,
      changeReason: "Atualização automática a partir do requisito SGQ",
    });
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
