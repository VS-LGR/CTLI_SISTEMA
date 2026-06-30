import { invokeSupabaseEdgeFunction } from "@/lib/supabaseFunctions";
import { emitCertificate } from "@/lib/calibrationCertificates/certificateApi";
import { CERTIFICATE_DOC_CODE, CERTIFICATE_TEMPLATE_KEY } from "@/lib/calibrationCertificates/certificateSchema";

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

async function loadPdfAssets(cert, tenant, logoDataUrl) {
  const { prepareMasterDocumentExport } = await import(
    "@/lib/masterDocuments/masterDocumentExportHelper"
  );
  const { loadCertificateSignatures } = await import("@/lib/certificateExport");
  const { loadPlatformDiagramPanels } = await import(
    "@/lib/certificatePdf/loadPlatformDiagrams"
  );

  const { meta, fileName } = await prepareMasterDocumentExport({
    tenantId: tenant?.id,
    templateKey: CERTIFICATE_TEMPLATE_KEY,
    code: CERTIFICATE_DOC_CODE,
    record: cert,
    defaultTitle: cert.certificate_type === "rbc"
      ? "CERTIFICADO DE CALIBRAÇÃO RBC"
      : "CERTIFICADO DE CALIBRAÇÃO RASTREÁVEL",
    fileNameContext: {
      numero: `${cert.certificate_number}-${cert.certificate_year}`,
      cliente: cert.client_name,
      numeroSerie: cert.scale_serial,
    },
    showFallbackToast: false,
  });

  const [signatureUrls, platformDiagrams] = await Promise.all([
    loadCertificateSignatures(cert),
    loadPlatformDiagramPanels(cert.balance_snapshot?.tipo_plataforma),
  ]);

  return {
    meta,
    fileName,
    renderOpts: {
      logoDataUrl,
      tenant,
      documentMeta: meta,
      fileName,
      preview: false,
      cancelled: cert.status === "cancelado",
      signatureUrls,
      platformDiagrams,
      download: false,
    },
  };
}

export async function buildCertificatePdfForEmail(cert, tenantName, { tenant, logoDataUrl } = {}) {
  const { buildCertificatePdfBlob } = await import(
    /* webpackChunkName: "certificate-pdf" */ "@/lib/certificatePdf/drawCertificatePdf"
  );
  const { fileName, renderOpts } = await loadPdfAssets(cert, tenant, logoDataUrl);
  const { blob } = buildCertificatePdfBlob(cert, tenantName, renderOpts);
  if (blob.size > 4 * 1024 * 1024) {
    throw new Error("PDF muito grande para envio por e-mail (máx. 4 MB)");
  }
  return { blob, fileName };
}

export async function sendCertificateByEmail(
  cert,
  {
    tenant,
    tenantName = "",
    logoDataUrl,
    recipientEmail,
    endCustomers = [],
  } = {},
) {
  const resolved = recipientEmail?.trim()
    ? { email: recipientEmail.trim(), source: "manual" }
    : resolveClientEmail(cert, endCustomers);
  if (!resolved.email) {
    throw new Error("E-mail do cliente não cadastrado. Atualize em Cadastros → Clientes.");
  }

  const { blob, fileName } = await buildCertificatePdfForEmail(cert, tenantName || tenant?.name || "", {
    tenant,
    logoDataUrl,
  });
  const pdfBase64 = await blobToBase64(blob);

  return invokeSupabaseEdgeFunction("send-calibration-certificate", {
    action: "send",
    certificateId: cert.id,
    tenantId: tenant?.id || cert.tenant_id,
    pdfBase64,
    fileName,
    recipientEmail: resolved.email,
  });
}

export async function notifySignatoryPendingApproval(cert, { tenantId } = {}) {
  return invokeSupabaseEdgeFunction("send-calibration-certificate", {
    action: "notify",
    certificateId: cert.id,
    tenantId: tenantId || cert.tenant_id,
  });
}

/**
 * Emite oficialmente (se aprovado) e envia ao cliente por e-mail.
 * @returns certificado atualizado após envio
 */
export async function emitAndSendCertificate(
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
    current = await emitCertificate(current.id, { userId, documentMeta, fileName });
  } else if (!["emitido", "enviado"].includes(current.status)) {
    throw new Error(`Certificado não pode ser enviado no status: ${current.status}`);
  }

  await sendCertificateByEmail(current, {
    tenant,
    tenantName,
    logoDataUrl,
    endCustomers,
    recipientEmail,
  });

  const { getCertificate } = await import("@/lib/calibrationCertificates/certificateApi");
  return getCertificate(current.id);
}

/** Envio sequencial com callback de progresso. */
export async function sendCertificatesByEmailBatch(
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
      const updated = await emitAndSendCertificate(cert, {
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
      onProgress?.({ index: i + 1, total: certificateIds.length, certificateId: id, status: "error", error: message });
    }
  }
  return results;
}
