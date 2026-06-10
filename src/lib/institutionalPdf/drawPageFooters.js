import { FOOTER_FONT_SIZE, FOOTER_Y, MR, PAGE_W, TEXT } from "./theme";

/**
 * Rodapé institucional: apenas numeração de páginas.
 * @param {import("jspdf").jsPDF} doc
 * @param {{ footerY?: number, rightX?: number }} [opts]
 */
export function drawInstitutionalPageFooters(doc, opts = {}) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const footerY = opts.footerY ?? (pageH > PAGE_W ? FOOTER_Y : pageH - 10);
  const rightX = opts.rightX ?? (pageW > PAGE_W ? pageW - 10 : MR);
  const total = doc.internal.getNumberOfPages();
  for (let p = 1; p <= total; p += 1) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(FOOTER_FONT_SIZE);
    doc.setTextColor(...TEXT);
    doc.text(`N.PÁG.: ${p} / ${total}`, rightX, footerY, { align: "right" });
  }
}
