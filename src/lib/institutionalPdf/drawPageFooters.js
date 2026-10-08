import { drawHtmlFormFooters } from "./htmlFormChrome";

/**
 * Rodapé do guia: identificação do modelo à esquerda e página à direita.
 * @param {import("jspdf").jsPDF} doc
 * @param {{ footerY?: number, rightX?: number, code?: string, revision?: string }} [opts]
 */
export function drawInstitutionalPageFooters(doc, opts = {}) {
  drawHtmlFormFooters(doc, {
    code: opts.code,
    revision: opts.revision,
    footerY: opts.footerY,
    rightX: opts.rightX,
  });
}
