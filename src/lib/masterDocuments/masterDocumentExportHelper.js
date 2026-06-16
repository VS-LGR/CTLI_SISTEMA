import { toast } from "sonner";
import { resolveDocumentForExport } from "./masterDocumentResolver";
import { generateDocumentFileName, resolveFileNameConflict } from "./masterDocumentFileName";
import { createDocumentSnapshot, saveDocumentGeneratedSnapshot } from "./masterDocumentSnapshot";
import { canUseDocumentForExport } from "./masterDocumentValidation";
import { listGeneratedSnapshots } from "./masterDocumentsApi";

/**
 * Prepara metadados e nome de arquivo para exportação PDF.
 */
export async function prepareMasterDocumentExport({
  tenantId,
  templateKey,
  code,
  record,
  defaultTitle,
  fileNameContext = {},
  extension = "pdf",
  showFallbackToast = true,
}) {
  const meta = await resolveDocumentForExport({
    tenantId,
    templateKey,
    code,
    record,
    defaultTitle,
  });

  if (meta?.usedFallback && showFallbackToast) {
    toast.warning("Documento não encontrado na Lista Mestra. Usando dados padrão temporários.", {
      id: `master-doc-fallback-${templateKey || code}`,
    });
  }

  const useCheck = canUseDocumentForExport(meta);
  if (!useCheck.allowed && !record?.document_code) {
    throw new Error(useCheck.reason || "Documento não disponível para exportação");
  }

  let fileName = generateDocumentFileName(meta, fileNameContext, extension);

  if (tenantId) {
    try {
      const existing = await listGeneratedSnapshots(tenantId, { limit: 500 });
      const names = (existing || []).map((s) => s.export_file_name);
      fileName = resolveFileNameConflict(fileName, names);
    } catch { /* ignore */ }
  }

  return { meta, fileName };
}

/**
 * Guarda snapshot após exportação bem-sucedida.
 */
export async function recordMasterDocumentExport({
  tenantId,
  meta,
  fileName,
  sourceModule,
  sourceRecordId,
  generatedById,
  fileUrl = "",
}) {
  if (!tenantId || !meta) return null;
  const snapshot = createDocumentSnapshot(meta, {
    sourceModule,
    sourceRecordId,
    exportFileName: fileName,
    generatedById,
    fileUrl,
  });
  return saveDocumentGeneratedSnapshot(tenantId, snapshot);
}
