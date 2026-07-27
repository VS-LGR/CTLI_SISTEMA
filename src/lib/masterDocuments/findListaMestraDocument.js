import { listMasterDocuments, findMasterDocumentByCode } from "./masterDocumentsApi";
import { getActiveDocumentByTemplateKey } from "./masterDocumentResolver";

export const LISTA_MESTRA_TEMPLATE_KEY = "re-83a-lista-mestra-pdf";
export const LISTA_MESTRA_DEFAULT_CODE = "RE-8.3A";

/**
 * Localiza o documento da própria Lista Mestra (RE-8.3A ou código remapeado).
 * Ordem: template_key → tipo lista → código legado.
 */
export async function findListaMestraDocument(tenantId) {
  if (!tenantId) return null;

  try {
    const byTemplate = await getActiveDocumentByTemplateKey(tenantId, LISTA_MESTRA_TEMPLATE_KEY);
    if (byTemplate?.id) {
      const { getMasterDocument } = await import("./masterDocumentsApi");
      const full = await getMasterDocument(tenantId, byTemplate.id);
      if (full) return full;
    }
  } catch {
    /* ignore */
  }

  const list = await listMasterDocuments(tenantId, {});
  const byType = list.find((d) => d.type === "lista" && /lista\s*mestra/i.test(d.title || ""));
  if (byType) return byType;

  const byCodeSuffix = list.find((d) => /^RE-\d/.test(d.code || "") && /lista\s*mestra/i.test(d.title || ""));
  if (byCodeSuffix) return byCodeSuffix;

  return findMasterDocumentByCode(tenantId, LISTA_MESTRA_DEFAULT_CODE);
}
