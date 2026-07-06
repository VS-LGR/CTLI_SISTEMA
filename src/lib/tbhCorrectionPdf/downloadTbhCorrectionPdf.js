import { prepareMasterDocumentExport, recordMasterDocumentExport } from "@/lib/masterDocuments/masterDocumentExportHelper";
import { buildTbhCorrectionPdfViewModel, buildTbhSessionCorrectionPdfViewModel } from "./viewModel";
import { createTbhCorrectionPdfDocument, createTbhSessionCorrectionPdfDocument } from "./drawTbhCorrectionPdf";

export async function downloadTbhCorrectionPdf(envCert, { tenantId, tenantName } = {}) {
  const vm = buildTbhCorrectionPdfViewModel(envCert, tenantName);
  const { meta, fileName } = await prepareMasterDocumentExport({
    tenantId,
    code: "RE-6.4E",
    defaultTitle: vm.documentTitle,
    fileNameContext: {
      equipamento: vm.equipment.name,
      ano: new Date().getFullYear(),
    },
  });

  const doc = createTbhCorrectionPdfDocument(vm);
  doc.save(fileName);

  if (tenantId && meta?.id) {
    await recordMasterDocumentExport({
      tenantId,
      meta,
      fileName,
      sourceModule: "cadastros_tbh",
      sourceRecordId: envCert?.id,
    });
  }

  return { fileName };
}

export async function downloadTbhSessionCorrectionPdf(byEquipment, { tenantId, tenantName } = {}) {
  const vm = buildTbhSessionCorrectionPdfViewModel({ byEquipment, tenantName });
  const { meta, fileName } = await prepareMasterDocumentExport({
    tenantId,
    code: "RE-6.4D",
    defaultTitle: vm.documentTitle,
    fileNameContext: { ano: new Date().getFullYear() },
  });

  const doc = createTbhSessionCorrectionPdfDocument(vm);
  doc.save(fileName);

  if (tenantId && meta?.id) {
    await recordMasterDocumentExport({
      tenantId,
      meta,
      fileName,
      sourceModule: "tbh_correction_session",
    });
  }

  return { fileName };
}
