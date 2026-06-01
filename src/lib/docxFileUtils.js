/** Helpers leves para identificação de ficheiros Word (.docx / .doc). */

export const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/** Apenas .docx (Office Open XML). Não inclui .doc legado. */
export function isDocxFile(file) {
  if (!file) return false;
  const n = (file.name || "").toLowerCase();
  if (n.endsWith(".docx")) return true;
  if (file.type === DOCX_MIME) return true;
  return false;
}

/** Ficheiro já guardado no Storage é .docx */
export function isDocxFileName(fileName, mime) {
  const n = (fileName || "").toLowerCase();
  if (n.endsWith(".docx")) return true;
  if (mime === DOCX_MIME) return true;
  return false;
}

/** Word 97–2003 (.doc) — anexo apenas, sem conversão mammoth. */
export function isLegacyDocFile(file) {
  if (!file?.name) return false;
  const n = file.name.toLowerCase();
  return n.endsWith(".doc") && !n.endsWith(".docx");
}

/** Mensagem de sucesso após upload, conforme tipo de ficheiro e conversão. */
export function uploadSuccessMessage(file, { imported, warning } = {}) {
  if (isDocxFile(file) && imported) return "Word importado para o editor";
  if (isDocxFile(file)) return "Word anexado (abrir no editor para editar)";
  if (isLegacyDocFile(file)) return "Arquivo .doc anexado (sem importação para o editor)";
  if (warning) return `Arquivo anexado. ${warning}`;
  return "Arquivo anexado";
}
