import { triggerBlobDownload } from "@/lib/documentExport";

/** Coloque o modelo institucional em public/templates/modelo-procedimento-trevo.docx */
export const PROCEDURE_TEMPLATE_DOCX_URL = "/templates/modelo-procedimento-trevo.docx";

/**
 * Descarrega o modelo .docx Trevo (se existir em public/templates).
 * @returns {Promise<boolean>} true se o ficheiro existir e o download iniciar
 */
export async function downloadProcedureTemplateDocx() {
  const res = await fetch(PROCEDURE_TEMPLATE_DOCX_URL);
  if (!res.ok) return false;
  const blob = await res.blob();
  triggerBlobDownload(blob, "modelo-procedimento-trevo.docx");
  return true;
}
