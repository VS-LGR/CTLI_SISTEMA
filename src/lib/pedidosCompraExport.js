import { formatOrderNumber } from "./purchaseOrderTypes";

function fileSlug(order) {
  const num = formatOrderNumber(order?.order_number, order?.order_year).replace(/\//g, "-");
  return `pedido-${num}`;
}

/** Carrega jsPDF só ao exportar. */
export async function exportPedidoCompraPdf(order, { logoDataUrl } = {}) {
  const { drawPedidoCompraPdf } = await import(
    /* webpackChunkName: "pedido-compra-pdf" */ "./pedidoCompraPdf/drawPedidoCompraPdf"
  );
  const doc = drawPedidoCompraPdf(order, { logoDataUrl });
  doc.save(`${fileSlug(order)}.pdf`);
}
