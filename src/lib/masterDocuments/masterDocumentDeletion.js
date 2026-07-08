import { supabase } from "@/lib/supabaseClient";
import { isSupabaseAuthMode } from "@/lib/api";
import { TENANT_DOCUMENTS_BUCKET } from "@/lib/documentsApi";
import {
  createDocumentRevision,
  deleteMasterDocument,
  getMasterDocument,
} from "./masterDocumentsApi";
import { saveDocumentGeneratedSnapshot } from "./masterDocumentSnapshot";
import { clearMasterDocumentCache } from "./masterDocumentResolver";

function assertSupabase() {
  if (!isSupabaseAuthMode) throw new Error("Lista Mestra requer ligação Supabase.");
}

export async function listLinkedTenantDocuments(tenantId, masterDocumentId) {
  assertSupabase();
  if (!masterDocumentId) return [];
  const { data, error } = await supabase
    .from("tenant_documents")
    .select("id, title, code, section, requirement, folder_key, status, master_document_id, storage_path")
    .eq("tenant_id", tenantId)
    .eq("master_document_id", masterDocumentId);
  if (error) throw error;
  return data || [];
}

export async function countLinkedTenantDocuments(tenantId, masterDocumentId) {
  assertSupabase();
  if (!masterDocumentId) return 0;
  const { count, error } = await supabase
    .from("tenant_documents")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("master_document_id", masterDocumentId);
  if (error) throw error;
  return count || 0;
}

export async function getLinkedTenantDocumentCounts(tenantId) {
  assertSupabase();
  const { data, error } = await supabase
    .from("tenant_documents")
    .select("master_document_id")
    .eq("tenant_id", tenantId)
    .not("master_document_id", "is", null);
  if (error) throw error;
  const counts = {};
  for (const row of data || []) {
    const id = row.master_document_id;
    counts[id] = (counts[id] || 0) + 1;
  }
  return counts;
}

/** Entrada da lista mestra apenas se existir no sistema (ficheiro SGQ ou cadastro manual). */
export function isSystemPresentMasterDocument(doc, linkedCount = 0) {
  if (!doc) return false;
  if (linkedCount > 0) return true;
  if (doc.template_key) return true;
  if (["rascunho", "em_revisao", "obsoleto", "retido_como_obsoleto"].includes(doc.status)) return true;
  if (doc.status === "cancelado") return false;
  // Catálogo pré-definido sem ficheiro real no SGQ
  if (doc.status === "ativo" && /^(PR|RE)-[\d.]+/i.test(String(doc.code || "").trim())) return false;
  return true;
}

async function deleteTenantDocumentRow(doc) {
  if (!doc?.id) return;
  if (doc.storage_path) {
    await supabase.storage.from(TENANT_DOCUMENTS_BUCKET).remove([doc.storage_path]);
  }
  const { error } = await supabase.from("tenant_documents").delete().eq("id", doc.id);
  if (error) throw error;
}

async function recordDocumentDeletionAudit(tenantId, masterDoc, { source, linkedDocs = [] }) {
  const linkedSummary = linkedDocs.map((d) => ({
    id: d.id,
    title: d.title,
    section: d.section,
    requirement: d.requirement,
    folder_key: d.folder_key,
  }));

  try {
    await createDocumentRevision(tenantId, masterDoc.id, {
      revision_number: masterDoc.current_revision || "00",
      issue_date: masterDoc.current_issue_date || null,
      revision_date: new Date().toISOString().slice(0, 10),
      change_description: "Remoção permanente do sistema",
      change_reason: `Exclusão via ${source}`,
      status: "cancelada",
      notes: `Registros SGQ removidos: ${linkedSummary.length}`,
    });
  } catch (err) {
    console.warn("[masterDocumentDeletion] revision audit failed:", err);
  }

  await saveDocumentGeneratedSnapshot(tenantId, {
    master_document_id: masterDoc.id,
    source_module: "document_deletion",
    source_record_id: masterDoc.id,
    document_code: masterDoc.code || "",
    document_title: masterDoc.title || "",
    document_reference: masterDoc.reference || "",
    document_revision: masterDoc.current_revision || "00",
    document_issue_date: masterDoc.current_issue_date || null,
    document_template_key: masterDoc.template_key || "",
    export_file_name: "",
    notes: JSON.stringify({
      source,
      deletedAt: new Date().toISOString(),
      linkedTenantDocuments: linkedSummary,
    }),
  });
}

/**
 * Remove documento da Lista Mestra e todos os ficheiros SGQ vinculados.
 */
export async function deleteMasterDocumentCascade(tenantId, masterDocumentId, { source = "lista_mestra" } = {}) {
  assertSupabase();
  const masterDoc = await getMasterDocument(tenantId, masterDocumentId);
  if (!masterDoc) throw new Error("Documento não encontrado na Lista Mestra");

  const linked = await listLinkedTenantDocuments(tenantId, masterDocumentId);
  await recordDocumentDeletionAudit(tenantId, masterDoc, { source, linkedDocs: linked });

  for (const td of linked) {
    await deleteTenantDocumentRow(td);
  }

  await deleteMasterDocument(tenantId, masterDocumentId);
  clearMasterDocumentCache(tenantId);
  return { removedMaster: true, removedTenantDocuments: linked.length };
}

/**
 * Após exclusão de um documento SGQ, remove da Lista Mestra se não houver mais vínculos.
 */
export async function removeMasterDocumentIfOrphaned(tenantId, masterDocumentId, { source = "sgq_delete" } = {}) {
  assertSupabase();
  if (!masterDocumentId) return { removed: false };

  const remaining = await countLinkedTenantDocuments(tenantId, masterDocumentId);
  if (remaining > 0) return { removed: false };

  const masterDoc = await getMasterDocument(tenantId, masterDocumentId);
  if (!masterDoc) return { removed: false };

  const isManualOnly = masterDoc.status === "rascunho" && !masterDoc.template_key;
  if (isManualOnly) return { removed: false };

  await recordDocumentDeletionAudit(tenantId, masterDoc, { source, linkedDocs: [] });
  await deleteMasterDocument(tenantId, masterDocumentId);
  clearMasterDocumentCache(tenantId);
  return { removed: true };
}
