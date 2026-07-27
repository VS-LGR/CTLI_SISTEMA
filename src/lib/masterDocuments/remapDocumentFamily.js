import { supabase } from "@/lib/supabaseClient";
import { assertSupabaseMasterDocuments } from "./masterDocumentsApi";
import { clearMasterDocumentCache } from "./masterDocumentResolver";

export { normalizeCodeBase } from "./remapCodeUtils";

/**
 * Preview de remapeamento de família (ex.: 6.2 → 5.1) sem gravar.
 */
export async function previewRemapDocumentFamily(tenantId, fromBase, toBase, docTypes = "ambos") {
  assertSupabaseMasterDocuments();
  const { data, error } = await supabase.rpc("preview_remap_master_document_family", {
    p_tenant_id: tenantId,
    p_from_base: fromBase,
    p_to_base: toBase,
    p_doc_types: docTypes,
  });
  if (error) throw error;
  return data || { items: [], count: 0 };
}

/**
 * Remapeia família de códigos no tenant ativo e limpa cache.
 */
export async function remapDocumentFamily(tenantId, fromBase, toBase, docTypes = "ambos") {
  assertSupabaseMasterDocuments();
  const { data, error } = await supabase.rpc("remap_master_document_family", {
    p_tenant_id: tenantId,
    p_from_base: fromBase,
    p_to_base: toBase,
    p_doc_types: docTypes,
  });
  if (error) throw error;
  clearMasterDocumentCache(tenantId);
  return data || { updated_documents: 0, items: [] };
}
