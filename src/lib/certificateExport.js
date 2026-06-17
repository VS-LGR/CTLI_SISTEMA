import { supabase } from "@/lib/supabaseClient";
import { CADASTRO_STORAGE_BUCKET } from "@/lib/cadastroConstants";
import { CERTIFICATE_DOC_CODE, CERTIFICATE_TEMPLATE_KEY } from "@/lib/calibrationCertificates/certificateSchema";
import { buildCertificatePdfViewModel } from "./certificatePdf/viewModel";

export { buildCertificatePdfViewModel };

async function loadSignatureDataUrl(storagePath) {
  if (!storagePath) return null;
  const { data, error } = await supabase.storage
    .from(CADASTRO_STORAGE_BUCKET)
    .createSignedUrl(storagePath, 3600);
  if (error || !data?.signedUrl) return null;
  try {
    const res = await fetch(data.signedUrl);
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

async function loadCertificateSignatures(cert) {
  const executorPath = cert.technical_snapshot?.executorSnapshot?.signature_storage_path;
  const signatoryPath = cert.technical_snapshot?.signatorySnapshot?.signature_storage_path;
  const ids = [cert.executor_id, cert.signatory_id].filter(Boolean);
  let executorStorage = executorPath;
  let signatoryStorage = signatoryPath;

  if (ids.length && (!executorStorage || !signatoryStorage)) {
    const { data } = await supabase
      .from("employee_registrations")
      .select("id, signature_storage_path")
      .in("id", ids);
    const byId = Object.fromEntries((data || []).map((e) => [e.id, e.signature_storage_path]));
    if (!executorStorage && cert.executor_id) executorStorage = byId[cert.executor_id];
    if (!signatoryStorage && cert.signatory_id) signatoryStorage = byId[cert.signatory_id];
  }

  const [executor, signatory] = await Promise.all([
    loadSignatureDataUrl(executorStorage),
    loadSignatureDataUrl(signatoryStorage),
  ]);
  return { executor, signatory };
}

export async function exportCertificatePdfPreview(cert, tenantName = "", {
  logoDataUrl, tenant = null, cancelled = false, skipRecordExport = false,
} = {}) {
  const { prepareMasterDocumentExport, recordMasterDocumentExport } = await import(
    "./masterDocuments/masterDocumentExportHelper"
  );
  const { meta, fileName } = await prepareMasterDocumentExport({
    tenantId: tenant?.id,
    templateKey: CERTIFICATE_TEMPLATE_KEY,
    code: CERTIFICATE_DOC_CODE,
    record: cert,
    defaultTitle: cert.certificate_type === "rbc" ? "CERTIFICADO DE CALIBRAÇÃO RBC" : "CERTIFICADO DE CALIBRAÇÃO RASTREÁVEL",
    fileNameContext: {
      numero: `${cert.certificate_number}-${cert.certificate_year}`,
      cliente: cert.client_name,
      numeroSerie: cert.scale_serial,
    },
    showFallbackToast: !cert.is_preview_only,
  });

  const { renderCertificatePdf } = await import(
    /* webpackChunkName: "certificate-pdf" */ "./certificatePdf/drawCertificatePdf"
  );
  const { loadPlatformDiagramPanels } = await import(
    /* webpackChunkName: "certificate-pdf" */ "./certificatePdf/loadPlatformDiagrams"
  );

  const [signatureUrls, platformDiagrams] = await Promise.all([
    loadCertificateSignatures(cert),
    loadPlatformDiagramPanels(cert.balance_snapshot?.tipo_plataforma),
  ]);
  const preview = cert.status !== "emitido" || cert.is_preview_only;
  await renderCertificatePdf(cert, tenantName, {
    logoDataUrl,
    tenant,
    documentMeta: meta,
    fileName,
    preview,
    cancelled,
    signatureUrls,
    platformDiagrams,
  });

  if (tenant?.id && cert.status === "emitido" && !cert.is_preview_only && !skipRecordExport) {
    await recordMasterDocumentExport({
      tenantId: tenant.id,
      meta,
      fileName,
      sourceModule: "calibration_certificate",
      sourceRecordId: cert.id,
    });
  }

  return { meta, fileName };
}

export async function exportCertificatePdfOfficial(cert, tenantName, opts = {}) {
  const { emitCertificate } = await import("./calibrationCertificates/certificateApi");
  const emitted = opts.alreadyEmitted ? cert : await emitCertificate(cert.id, {
    userId: opts.userId,
  });

  return exportCertificatePdfPreview(emitted, tenantName, {
    ...opts,
    cancelled: emitted.status === "cancelado",
  });
}
