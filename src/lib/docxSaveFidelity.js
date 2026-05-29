/**
 * Validação de cabeçalho/rodapé Word ao gravar .docx (fingerprints via JSZip).
 */
import JSZip from "jszip";

const HEADER_FOOTER_PATH = /^word\/(header\d+\.xml|footer\d+\.xml)$/i;

/** @returns {Promise<Record<string, string>>} path → conteúdo XML normalizado */
export async function extractHeaderFooterFingerprints(arrayBuffer) {
  if (!arrayBuffer?.byteLength) return {};
  const zip = await JSZip.loadAsync(arrayBuffer);
  const fingerprints = {};
  await Promise.all(
    Object.keys(zip.files).map(async (name) => {
      const entry = zip.files[name];
      if (!entry || entry.dir || !HEADER_FOOTER_PATH.test(name)) return;
      const xml = await entry.async("string");
      fingerprints[name] = normalizeXml(xml);
    }),
  );
  return fingerprints;
}

function normalizeXml(xml) {
  return xml.replace(/\s+/g, " ").trim();
}

/** Verifica se todos os headers/footers do original permanecem iguais. */
export function headersFootersPreserved(before, after) {
  const keys = Object.keys(before || {});
  if (keys.length === 0) return true;
  for (const key of keys) {
    if (before[key] !== after?.[key]) return false;
  }
  return true;
}

/**
 * Grava via editor com save seletivo e valida cabeçalho/rodapé.
 * @returns {Promise<{ buffer: ArrayBuffer|null, skipped: boolean, headerRegression?: boolean, error?: string }>}
 */
export async function saveDocxWithFidelity(editorRef, originalBuffer, { dirty = true } = {}) {
  if (!editorRef?.current?.save) {
    return { buffer: null, skipped: false, error: "Editor não disponível" };
  }
  if (!dirty) {
    return { buffer: null, skipped: true };
  }

  const beforeFp = originalBuffer
    ? await extractHeaderFooterFingerprints(originalBuffer)
    : null;

  let buf = await editorRef.current.save({ selective: true });
  if (!buf?.byteLength) {
    buf = await editorRef.current.save({ selective: false });
  }
  if (!buf?.byteLength) {
    return { buffer: null, skipped: false, error: "Não foi possível exportar o documento do editor" };
  }

  if (beforeFp && Object.keys(beforeFp).length > 0) {
    const afterFp = await extractHeaderFooterFingerprints(buf);
    if (!headersFootersPreserved(beforeFp, afterFp)) {
      return {
        buffer: null,
        skipped: false,
        headerRegression: true,
        error:
          "O cabeçalho ou rodapé Word foi alterado ao guardar. "
          + "Use «Baixar original» para recuperar o ficheiro intacto.",
      };
    }
  }

  return { buffer: buf, skipped: false, headerRegression: false };
}
