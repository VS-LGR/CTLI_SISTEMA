import { invokeSupabaseEdgeFunction } from "@/lib/supabaseFunctions";
import { emitWeightCertificate } from "./weightCertificateApi";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value) {
  return EMAIL_RE.test(String(value || "").trim());
}

/** Resolve e-mail do cliente: cadastro vivo ou snapshot técnico. */
export function resolveClientEmail(cert, endCustomers = []) {
  const live = endCustomers.find((c) => c.id === cert?.end_customer_id);
  if (live?.email && isValidEmail(live.email)) {
    return { email: live.email.trim(), source: "cadastro" };
  }
  const snap = cert?.technical_snapshot?.clientSnapshot?.email
    || cert?.technical_snapshot?.client_snapshot?.email;
  if (snap && isValidEmail(snap)) {
    return { email: String(snap).trim(), source: "snapshot" };
  }
  return { email: "", source: "none" };
}

export function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Falha ao codificar PDF"));
        return;
      }
      const base64 = result.split(",")[1] || "";
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("Falha ao ler PDF"));
    reader.readAsDataURL(blob);
  });
}

export async function buildWeightCertificatePdfForEmail(
  cert,
  tenantName,
  { tenant, logoDataUrl, documentMeta, fileName } = {},
) {
  const { exportWeightCertificatePdfBlob } = await import("./weightCertificateExport");
  const { blob, fileName: outName } = await exportWeightCertificatePdfBlob(cert, tenantName, {
    logoDataUrl,
    tenant,
    cancelled: cert.status === "cancelado",
    documentMeta,
    fileName,
    compressForEmail: true,
  });

  if (blob.size > 4 * 1024 * 1024) {
    const mb = Math.round((blob.size / (1024 * 1024)) * 10) / 10;
    throw new Error(`PDF muito grande para envio por e-mail (${mb} MB; máx. 4 MB).`);
  }
  return { blob, fileName: outName };
}

export async function sendWeightCertificateByEmail(
  cert,
  {
    tenant,
    tenantName = "",
    logoDataUrl,
    recipientEmail,
    endCustomers = [],
    documentMeta,
    fileName,
  } = {},
) {
  const resolved = recipientEmail?.trim()
    ? { email: recipientEmail.trim(), source: "manual" }
    : resolveClientEmail(cert, endCustomers);
  if (!resolved.email) {
    throw new Error("E-mail do cliente não cadastrado. Atualize em PR-7.1 → Clientes.");
  }

  const { blob, fileName: pdfName } = await buildWeightCertificatePdfForEmail(
    cert,
    tenantName || tenant?.name || "",
    { tenant, logoDataUrl, documentMeta, fileName },
  );
  const pdfBase64 = await blobToBase64(blob);

  return invokeSupabaseEdgeFunction("send-weight-calibration-certificate", {
    action: "send",
    certificateId: cert.id,
    tenantId: tenant?.id || cert.tenant_id,
    pdfBase64,
    fileName: pdfName,
    recipientEmail: resolved.email,
  });
}

export async function notifyWeightSignatoryPendingApproval(cert, { tenantId } = {}) {
  return invokeSupabaseEdgeFunction("send-weight-calibration-certificate", {
    action: "notify",
    certificateId: cert.id,
    tenantId: tenantId || cert.tenant_id,
  });
}

/**
 * Emite oficialmente (se aprovado) e envia ao cliente por e-mail.
 * @returns certificado atualizado após envio
 */
export async function emitAndSendWeightCertificate(
  cert,
  {
    userId,
    tenant,
    tenantName,
    logoDataUrl,
    endCustomers = [],
    recipientEmail,
    documentMeta,
    fileName,
  } = {},
) {
  let current = cert;
  if (current.status === "aprovado") {
    current = await emitWeightCertificate(current.id, userId, { documentMeta, fileName });
  } else if (!["emitido", "enviado"].includes(current.status)) {
    throw new Error(`Certificado não pode ser enviado no status: ${current.status}`);
  }

  await sendWeightCertificateByEmail(current, {
    tenant,
    tenantName,
    logoDataUrl,
    endCustomers,
    recipientEmail,
    documentMeta,
    fileName,
  });
  const { getWeightCertificate } = await import("./weightCertificateApi");
  return getWeightCertificate(current.id);
}

/** Envio sequencial com callback de progresso. */
export async function sendWeightCertificatesByEmailBatch(
  certificateIds,
  {
    loadCertificate,
    tenant,
    tenantName,
    logoDataUrl,
    endCustomers = [],
    onProgress,
  },
) {
  const results = [];
  for (let i = 0; i < certificateIds.length; i += 1) {
    const id = certificateIds[i];
    onProgress?.({ index: i + 1, total: certificateIds.length, certificateId: id, status: "loading" });
    try {
      const cert = await loadCertificate(id);
      const updated = await emitAndSendWeightCertificate(cert, {
        tenant,
        tenantName,
        logoDataUrl,
        endCustomers,
      });
      results.push({ id, ok: true, cert: updated });
      onProgress?.({ index: i + 1, total: certificateIds.length, certificateId: id, status: "done" });
    } catch (err) {
      const message = err?.message || String(err);
      results.push({ id, ok: false, error: message });
      onProgress?.({
        index: i + 1,
        total: certificateIds.length,
        certificateId: id,
        status: "error",
        error: message,
      });
    }
  }
  return results;
}
