export async function exportQuotationRequestPdf(request, { logoDataUrl } = {}) {
  const mod = await import(
    /* webpackChunkName: "quotation-request-pdf" */
    "@/lib/quotationRequestPdf/drawQuotationRequestPdf"
  );
  return mod.drawQuotationRequestPdf(request, { logoDataUrl });
}
