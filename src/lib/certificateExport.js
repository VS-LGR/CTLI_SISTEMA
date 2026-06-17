import { CERTIFICATE_DOC_CODE, CERTIFICATE_TEMPLATE_KEY } from "@/lib/calibrationCertificates/certificateSchema";
import { buildCertificatePdfViewModel } from "./certificatePdf/viewModel";

export { buildCertificatePdfViewModel };

export async function exportCertificatePdfPreview(cert, tenantName = "", { logoDataUrl, tenant = null, cancelled = false } = {}) {
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

  const preview = cert.status !== "emitido" || cert.is_preview_only;
  await renderCertificatePdf(cert, tenantName, {
    logoDataUrl,
    tenant,
    documentMeta: meta,
    fileName,
    preview,
    cancelled,
  });

  if (tenant?.id && cert.status === "emitido" && !cert.is_preview_only) {
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
