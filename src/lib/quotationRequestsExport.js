import { formatRequestNumber } from "./quotationRequestDisplay";

export async function exportQuotationRequestPdf(request, { logoDataUrl, tenantId, userId } = {}) {
  const { prepareMasterDocumentExport, recordMasterDocumentExport } = await import(
    "./masterDocuments/masterDocumentExportHelper"
  );
  const supplierName = request.supplier_data_snapshot?.company || request.supplier?.name || "";
  const { meta, fileName } = await prepareMasterDocumentExport({
    tenantId,
    templateKey: "re-66c-solicitacao-orcamento-pdf",
    code: request.document_code || "RE-6.6C",
    record: request,
    defaultTitle: "SOLICITAÇÃO DE ORÇAMENTO",
    fileNameContext: {
      numero: formatRequestNumber(request.request_number, request.request_year),
      fornecedor: supplierName,
      data: request.request_date,
    },
  });
  const mod = await import(
    /* webpackChunkName: "quotation-request-pdf" */
    "@/lib/quotationRequestPdf/drawQuotationRequestPdf"
  );
  mod.drawQuotationRequestPdf(request, { logoDataUrl, documentMeta: meta, fileName });
  if (tenantId) {
    await recordMasterDocumentExport({
      tenantId,
      meta,
      fileName,
      sourceModule: "quotation-request",
      sourceRecordId: request.id,
      generatedById: userId,
    });
  }
}
