import mammoth from "mammoth";

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/** Apenas .docx (Office Open XML). Não inclui .doc legado. */
export function isDocxFile(file) {
  if (!file) return false;
  const n = (file.name || "").toLowerCase();
  if (n.endsWith(".docx")) return true;
  if (file.type === DOCX_MIME) return true;
  return false;
}

/** Word 97–2003 (.doc) — anexo apenas, sem mammoth. */
export function isLegacyDocFile(file) {
  if (!file?.name) return false;
  const n = file.name.toLowerCase();
  return n.endsWith(".doc") && !n.endsWith(".docx");
}

/** Converte .docx para HTML (lança em erro — preferir tryConvertDocxToHtml). */
export async function docxFileToHtml(file) {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.convertToHtml({ arrayBuffer });
  return result.value || "";
}

/**
 * Tenta importar .docx para o editor. Em falha, devolve html null e aviso
 * para o caller fazer upload só do ficheiro.
 */
export async function tryConvertDocxToHtml(file) {
  if (!isDocxFile(file)) {
    return { html: null, warning: null, imported: false };
  }
  try {
    const html = await docxFileToHtml(file);
    return { html, warning: null, imported: true };
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[docxImport] conversão falhou", err);
    }
    const hint = isLegacyDocFile(file)
      ? "Formato .doc antigo não suporta importação para o editor."
      : "Não foi possível ler o .docx (ficheiro inválido ou corrompido).";
    return { html: null, warning: hint, imported: false };
  }
}

/** Mensagem de sucesso após upload, conforme tipo de ficheiro e conversão. */
export function uploadSuccessMessage(file, { imported, warning } = {}) {
  if (imported) return "Word importado para o editor";
  if (isLegacyDocFile(file)) return "Arquivo .doc anexado (sem importação para o editor)";
  if (warning) return `Arquivo anexado. ${warning}`;
  return "Arquivo anexado";
}
