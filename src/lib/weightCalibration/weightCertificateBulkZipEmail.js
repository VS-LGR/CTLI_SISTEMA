import { invokeSupabaseEdgeFunction } from "@/lib/supabaseFunctions";
import { blobToBase64, isValidEmail, resolveClientEmail } from "./weightCertificateEmailApi";
import {
  MAX_ZIP_EMAIL_BYTES,
  buildWeightCertificatesZipBlob,
  buildWeightCertificatesZipFileName,
  normalizeClientMatchName,
} from "./weightCertificateBulkZipDownload";

/**
 * Resolve e-mail único para um lote.
 * Exige que todos os certificados compartilhem o mesmo e-mail de destino.
 */
export function resolveBatchRecipientEmail(certs = [], endCustomers = []) {
  const emails = [];
  for (const cert of certs) {
    const { email } = resolveClientEmail(cert, endCustomers);
    if (!email || !isValidEmail(email)) {
      throw new Error(
        `E-mail do cliente não cadastrado para ${cert.client_name || cert.certificate_number || cert.id}. Atualize em PR-7.1 → Clientes.`,
      );
    }
    emails.push(email.trim().toLowerCase());
  }
  const unique = [...new Set(emails)];
  if (unique.length > 1) {
    throw new Error(
      "Os certificados selecionados têm e-mails de cliente diferentes. Envie por cliente ou selecione apenas um destinatário.",
    );
  }
  return unique[0];
}

/** Confirma que a seleção pertence a um único cliente (id ou nome). */
export function assertSameClientForBatch(certs = []) {
  if (!certs.length) return;
  const ids = new Set(certs.map((c) => c.end_customer_id).filter(Boolean));
  const names = new Set(certs.map((c) => normalizeClientMatchName(c.client_name)).filter(Boolean));
  if (ids.size > 1 || (ids.size === 0 && names.size > 1)) {
    throw new Error("Selecione certificados do mesmo cliente para enviar o ZIP por e-mail.");
  }
}

/**
 * Monta ZIP comprimido e envia um único e-mail com anexo .zip.
 * A edge marca todos os IDs como enviados.
 */
export async function sendWeightCertificatesZipByEmail({
  ids = [],
  loadCertificate,
  tenant = null,
  tenantName = "",
  logoDataUrl = null,
  endCustomers = [],
  recipientEmail = null,
  zipFileName = null,
  clientName = null,
  onProgress = null,
} = {}) {
  const list = Array.isArray(ids) ? ids.filter(Boolean) : [];
  if (!list.length) throw new Error("Nenhum certificado selecionado");
  if (typeof loadCertificate !== "function") throw new Error("loadCertificate é obrigatório");

  const certs = [];
  for (let i = 0; i < list.length; i += 1) {
    onProgress?.({ index: i + 1, total: list.length, id: list[i], phase: "load" });
    certs.push(await loadCertificate(list[i]));
  }

  assertSameClientForBatch(certs);
  const to = recipientEmail?.trim() || resolveBatchRecipientEmail(certs, endCustomers);

  const outName = zipFileName
    || buildWeightCertificatesZipFileName({
      clientName: clientName || certs[0]?.client_name || null,
    });

  const { blob, ok, fail, errors } = await buildWeightCertificatesZipBlob({
    ids: list,
    loadCertificate: async (id) => certs.find((c) => c.id === id) || loadCertificate(id),
    tenant,
    tenantName,
    logoDataUrl,
    zipFileName: outName,
    compressForEmail: true,
    onProgress: (p) => onProgress?.({ ...p, phase: "pdf" }),
  });

  if (blob.size > MAX_ZIP_EMAIL_BYTES) {
    const mb = Math.round((blob.size / (1024 * 1024)) * 10) / 10;
    throw new Error(
      `ZIP demasiado grande para e-mail (${mb} MB; máx. ~3,5 MB). Reduza a seleção ou envie em partes.`,
    );
  }

  const zipBase64 = await blobToBase64(blob);
  onProgress?.({ index: list.length, total: list.length, phase: "send" });

  const result = await invokeSupabaseEdgeFunction("send-weight-calibration-certificate", {
    action: "send_zip",
    tenantId: tenant?.id || certs[0]?.tenant_id,
    certificateIds: list,
    zipBase64,
    fileName: outName,
    recipientEmail: to,
  });

  return {
    ...result,
    ok,
    fail,
    errors,
    recipient: to,
    zipFileName: outName,
    count: list.length,
  };
}
