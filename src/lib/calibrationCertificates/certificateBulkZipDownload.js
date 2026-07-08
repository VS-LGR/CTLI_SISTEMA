import JSZip from "jszip";
import { exportCertificatePdfBlob } from "@/lib/certificateExport";
import { triggerBlobDownload } from "@/lib/blobDownload";

export const ZIP_DOWNLOADABLE_STATUSES = ["aprovado", "emitido", "enviado"];

export function isZipDownloadableRow(row) {
  return ZIP_DOWNLOADABLE_STATUSES.includes(row?.status);
}

/** Data local YYYY-MM-DD para nome de arquivo. */
export function zipDateStamp(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function sanitizeZipSegment(value, fallback = "cliente") {
  const cleaned = String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  return cleaned || fallback;
}

export function buildCertificatesZipFileName({ clientName = null, date = new Date() } = {}) {
  const stamp = zipDateStamp(date);
  if (clientName) {
    return `certificados-${sanitizeZipSegment(clientName)}-${stamp}.zip`;
  }
  return `certificados-${stamp}.zip`;
}

function uniquePdfFileName(baseName, used) {
  let name = baseName && String(baseName).trim() ? String(baseName).trim() : "certificado.pdf";
  if (!/\.pdf$/i.test(name)) name = `${name}.pdf`;
  if (!used.has(name.toLowerCase())) {
    used.add(name.toLowerCase());
    return name;
  }
  const stem = name.replace(/\.pdf$/i, "");
  let n = 2;
  let candidate;
  do {
    candidate = `${stem}-${n}.pdf`;
    n += 1;
  } while (used.has(candidate.toLowerCase()));
  used.add(candidate.toLowerCase());
  return candidate;
}

/**
 * Gera PDFs em sequência, empacota em ZIP (DEFLATE) e dispara o download.
 * @returns {{ ok: number, fail: number, errors: Array<{ id: string, message: string }> }}
 */
export async function downloadCertificatesZip({
  ids = [],
  loadCertificate,
  tenant = null,
  tenantName = "",
  logoDataUrl = null,
  zipFileName = null,
  onProgress = null,
  exportPdf = exportCertificatePdfBlob,
} = {}) {
  const list = Array.isArray(ids) ? ids.filter(Boolean) : [];
  if (!list.length) {
    throw new Error("Nenhum certificado selecionado para download");
  }
  if (typeof loadCertificate !== "function") {
    throw new Error("loadCertificate é obrigatório");
  }

  const zip = new JSZip();
  const usedNames = new Set();
  const errors = [];
  let ok = 0;

  for (let i = 0; i < list.length; i += 1) {
    const id = list[i];
    if (onProgress) onProgress({ index: i + 1, total: list.length, id });
    try {
      const full = await loadCertificate(id);
      const { blob, fileName } = await exportPdf(full, tenantName, {
        logoDataUrl,
        tenant,
        skipRecordExport: true,
      });
      if (!blob) throw new Error("PDF vazio");
      zip.file(uniquePdfFileName(fileName, usedNames), blob);
      ok += 1;
    } catch (e) {
      errors.push({ id, message: e?.message || String(e) });
    }
  }

  if (ok === 0) {
    throw new Error(errors[0]?.message || "Falha ao gerar os PDFs");
  }

  const outName = zipFileName || buildCertificatesZipFileName();
  const zipBlob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
  triggerBlobDownload(zipBlob, outName);

  return { ok, fail: errors.length, errors, zipFileName: outName };
}
