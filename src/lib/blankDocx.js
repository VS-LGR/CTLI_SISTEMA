import { Document, Packer, Paragraph, TextRun } from "docx";

let cachedBlank = null;

/**
 * DOCX vazio mínimo para novo procedimento sem ficheiro carregado.
 * Não inclui cabeçalho/rodapé institucional Trevo — use upload de modelo .docx
 * com layout completo (ver docs/DOCX-PROCEDIMENTOS.md).
 */
export async function getBlankDocxBuffer() {
  if (cachedBlank) return cachedBlank.slice(0);
  const doc = new Document({
    sections: [{
      children: [new Paragraph({ children: [new TextRun("")] })],
    }],
  });
  const blob = await Packer.toBlob(doc);
  cachedBlank = await blob.arrayBuffer();
  return cachedBlank.slice(0);
}
