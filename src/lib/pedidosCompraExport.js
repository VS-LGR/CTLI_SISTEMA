import { formatOrderNumber } from "./purchaseOrderTypes";

/** Carrega jsPDF só ao exportar. */
export async function exportPedidoCompraPdf(order, { logoDataUrl, employees = [], tenantId, userId } = {}) {
  const { prepareMasterDocumentExport, recordMasterDocumentExport } = await import(
    "./masterDocuments/masterDocumentExportHelper"
  );
  const supplierName = order.supplier?.name || order.supplier_data_snapshot?.company || order.supplier_data_snapshot?.name || "";
  const { meta, fileName } = await prepareMasterDocumentExport({
    tenantId,
    templateKey: "re-66d-pedido-compra-pdf",
    code: order.document_code || "RE-6.6D",
    record: order,
    defaultTitle: "PEDIDO DE COMPRA",
    fileNameContext: {
      numero: formatOrderNumber(order.order_number, order.order_year),
      fornecedor: supplierName,
      data: order.order_date,
    },
  });
  const { drawPedidoCompraPdf } = await import(
    /* webpackChunkName: "pedido-compra-pdf" */ "./pedidoCompraPdf/drawPedidoCompraPdf"
  );
  const doc = drawPedidoCompraPdf(order, { logoDataUrl, employees, documentMeta: meta });
  doc.save(fileName);
  if (tenantId) {
    await recordMasterDocumentExport({
      tenantId,
      meta,
      fileName,
      sourceModule: "purchase-order",
      sourceRecordId: order.id,
      generatedById: userId,
    });
  }
}
