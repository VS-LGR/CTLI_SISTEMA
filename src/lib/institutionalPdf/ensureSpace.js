import { CONTENT_BOTTOM } from "./theme";

/**
 * @param {import("jspdf").jsPDF} doc
 * @param {number} y
 * @param {number} needed
 * @param {() => number} redrawHeader
 * @param {number} [contentBottom=CONTENT_BOTTOM]
 */
export function ensureInstitutionalSpace(doc, y, needed, redrawHeader, contentBottom = CONTENT_BOTTOM) {
  if (y + needed > contentBottom) {
    doc.addPage();
    return redrawHeader() + 4;
  }
  return y;
}
