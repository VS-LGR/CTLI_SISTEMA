import { supabase } from "@/lib/supabaseClient";
import { CADASTRO_STORAGE_BUCKET } from "@/lib/cadastroConstants";
import { DOC_CODE, TEMPLATE_KEY } from "./weightCertificateSchema";
import { buildWeightCertificatePdfViewModel } from "@/lib/weightCertificatePdf/viewModel";

export { buildWeightCertificatePdfViewModel };

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

export async function loadWeightCertificateSignatures(cert, { signatoryOnly = false } = {}) {
  const signatoryPath = cert.technical_snapshot?.signatorySnapshot?.signature_storage_path;
  let signatoryStorage = signatoryPath;

  if (signatoryOnly) {
    if (!signatoryStorage && cert.signatory_id) {
      const { data } = await supabase
        .from("employee_registrations")
        .select("id, signature_storage_path")
        .eq("id", cert.signatory_id)
        .maybeSingle();
      signatoryStorage = data?.signature_storage_path;
    }
    const signatory = await loadSignatureDataUrl(signatoryStorage);
    return { executor: null, signatory };
  }

  const executorPath = cert.technical_snapshot?.executorSnapshot?.signature_storage_path;
  const ids = [cert.executor_id, cert.signatory_id].filter(Boolean);
  let executorStorage = executorPath;
  let signatoryStorageFull = signatoryPath;

  if (ids.length && (!executorStorage || !signatoryStorageFull)) {
    const { data } = await supabase
      .from("employee_registrations")
      .select("id, signature_storage_path")
      .in("id", ids);
    const byId = Object.fromEntries((data || []).map((e) => [e.id, e.signature_storage_path]));
    if (!executorStorage && cert.executor_id) executorStorage = byId[cert.executor_id];
    if (!signatoryStorageFull && cert.signatory_id) signatoryStorageFull = byId[cert.signatory_id];
  }

  const [executor, signatory] = await Promise.all([
    loadSignatureDataUrl(executorStorage),
    loadSignatureDataUrl(signatoryStorageFull),
  ]);
  return { executor, signatory };
}

async function prepareWeightExportMeta(cert, tenant, { showFallbackToast = false } = {}) {
  const { prepareMasterDocumentExport } = await import(
    "@/lib/masterDocuments/masterDocumentExportHelper"
  );
  return prepareMasterDocumentExport({
    tenantId: tenant?.id,
    templateKey: TEMPLATE_KEY,
    code: DOC_CODE,
    record: cert,
    defaultTitle:
      cert.certificate_type === "rbc"
        ? "CERTIFICADO DE CALIBRAÇÃO DE PESOS RBC"
        : "CERTIFICADO DE CALIBRAÇÃO DE PESOS RASTREÁVEL",
    fileNameContext: {
      numero: `${cert.certificate_number}-${cert.certificate_year}`,
      cliente: cert.client_name,
      numeroSerie: cert.weight_tag || cert.weight_serial,
    },
    showFallbackToast: showFallbackToast && !cert.is_preview_only,
  });
}

export async function exportWeightCertificatePdfPreview(cert, tenantName = "", {
  logoDataUrl,
  tenant = null,
  cancelled = false,
  skipRecordExport = false,
} = {}) {
  const { meta, fileName } = await prepareWeightExportMeta(cert, tenant, {
    showFallbackToast: true,
  });

  const { renderWeightCertificatePdf } = await import(
    /* webpackChunkName: "weight-certificate-pdf" */ "@/lib/weightCertificatePdf/drawWeightCertificatePdf"
  );

  const signatureUrls = await loadWeightCertificateSignatures(cert, { signatoryOnly: true });
  const preview = cert.status !== "emitido" || cert.is_preview_only;
  await renderWeightCertificatePdf(cert, tenantName, {
    logoDataUrl,
    tenant,
    documentMeta: meta,
    fileName,
    preview,
    cancelled,
    signatureUrls,
  });

  if (tenant?.id && cert.status === "emitido" && !cert.is_preview_only && !skipRecordExport) {
    const { recordMasterDocumentExport } = await import(
      "@/lib/masterDocuments/masterDocumentExportHelper"
    );
    await recordMasterDocumentExport({
      tenantId: tenant.id,
      meta,
      fileName,
      sourceModule: "weight_calibration_certificate",
      sourceRecordId: cert.id,
    });
  }

  return { meta, fileName };
}

/** Mesmo pipeline da prévia/download, mas retorna blob. */
export async function exportWeightCertificatePdfBlob(cert, tenantName = "", {
  logoDataUrl,
  tenant = null,
  cancelled = false,
  skipRecordExport = true,
  documentMeta: preMeta = null,
  fileName: preFileName = null,
  compressForEmail = false,
} = {}) {
  let meta = preMeta;
  let fileName = preFileName;

  if (!meta || !fileName) {
    const prepared = await prepareWeightExportMeta(cert, tenant, { showFallbackToast: false });
    meta = prepared.meta;
    fileName = prepared.fileName;
  }

  const { renderWeightCertificatePdf } = await import(
    /* webpackChunkName: "weight-certificate-pdf" */ "@/lib/weightCertificatePdf/drawWeightCertificatePdf"
  );

  const signatureUrls = await loadWeightCertificateSignatures(cert, { signatoryOnly: true });
  const preview = cert.status !== "emitido" || cert.is_preview_only;
  const { blob, fileName: outName } = await renderWeightCertificatePdf(cert, tenantName, {
    logoDataUrl,
    tenant,
    documentMeta: meta,
    fileName,
    preview,
    cancelled,
    signatureUrls,
    download: false,
    compressForEmail,
  });

  if (
    tenant?.id
    && cert.status === "emitido"
    && !cert.is_preview_only
    && !skipRecordExport
  ) {
    const { recordMasterDocumentExport } = await import(
      "@/lib/masterDocuments/masterDocumentExportHelper"
    );
    await recordMasterDocumentExport({
      tenantId: tenant.id,
      meta,
      fileName: outName || fileName,
      sourceModule: "weight_calibration_certificate",
      sourceRecordId: cert.id,
    });
  }

  return { blob, fileName: outName || fileName, meta };
}

export async function downloadWeightCertificatePdf(cert, tenantName, opts = {}) {
  return exportWeightCertificatePdfPreview(cert, tenantName, opts);
}

export async function exportWeightCertificatePdfOfficial(cert, tenantName, opts = {}) {
  const { emitWeightCertificate } = await import("./weightCertificateApi");
  const emitted = opts.alreadyEmitted
    ? cert
    : await emitWeightCertificate(cert.id, opts.userId);
  return exportWeightCertificatePdfPreview(emitted, tenantName, {
    ...opts,
    cancelled: emitted.status === "cancelado",
  });
}
