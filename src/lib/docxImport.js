import mammoth from "mammoth";

/** Converte .docx para HTML para o editor TipTap. */
export async function docxFileToHtml(file) {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.convertToHtml({ arrayBuffer });
  return result.value || "";
}

export function isDocxFile(file) {
  if (!file?.name) return false;
  const n = file.name.toLowerCase();
  return n.endsWith(".docx") || n.endsWith(".doc");
}
