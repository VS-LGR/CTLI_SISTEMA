/**
 * Layout visual do certificado RE-7.2B — reutiliza paleta e helpers da coleta RE-7.2A.
 */

import { formatDateBr } from "@/lib/quotationRequestDisplay";
import {
  FORM_COLORS,
  drawSectionBar,
  drawFieldGrid,
  drawMeasureBlock,
  tableHeadStyles,
  fieldLabelWithColon,
} from "@/lib/coletaPdf/coletaPdfLayout";

export {
  FORM_COLORS,
  drawSectionBar,
  drawFieldGrid,
  drawMeasureBlock,
  tableHeadStyles,
  fieldLabelWithColon,
};

export const ML = 10;
export const MR = 200;
export const PAGE_W = 210;
export const PAGE_H = 297;
export const CW = MR - ML;
export const FOOTER_Y = PAGE_H - 8;
export const CONTENT_BOTTOM = FOOTER_Y - 6;

export const LOGO_W = 32;
export const LOGO_H = 13;

/** @returns {number} y para início do conteúdo após cabeçalho */
export function drawCertificateHeader(doc, model, logoDataUrl, yStart = 6) {
  const headerTop = yStart;

  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, "PNG", ML, headerTop, LOGO_W, LOGO_H);
    } catch { /* opcional */ }
  }

  const centerX = PAGE_W / 2;
  doc.setTextColor(...FORM_COLORS.text);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("CERTIFICADO DE CALIBRAÇÃO Nº", centerX, headerTop + 8, { align: "center" });
  doc.setFontSize(12);
  doc.text(model.certificateNumber || "—", centerX, headerTop + 15, { align: "center" });

  if (model.certificateType === "rbc") {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text("RBC", PAGE_W - ML, headerTop + 6, { align: "right" });
  }

  return Math.max(headerTop + LOGO_H + 2, headerTop + 18) + 2;
}

/** Rodapé documental em todas as páginas (Código, Ref, Emissão, Página). */
export function drawCertificateDocumentFooters(doc, model) {
  const total = doc.internal.getNumberOfPages();
  const code = model.documentMeta?.code || "RE-7.2B";
  const rev = model.documentMeta?.revision || model.revision || "00";
  const ref = model.documentMeta?.reference || "PR-7.2";
  const emission = formatDateBr(model.documentMeta?.modelIssueDate) || "—";
  const line = `Código: ${code}  Rev.: ${rev}  Ref.: ${ref}  Emissão: ${emission}  Página`;

  for (let p = 1; p <= total; p += 1) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...FORM_COLORS.text);
    doc.text(`${line} ${p} de ${total}`, PAGE_W / 2, FOOTER_Y, { align: "center" });
  }
}

/**
 * Garante espaço vertical; adiciona página se necessário.
 * @returns {{ y: number, pageAdded: boolean }}
 */
export function ensureSpace(doc, y, needed, { model, logoDataUrl, compactHeader = true } = {}) {
  if (y + needed <= CONTENT_BOTTOM) return { y, pageAdded: false };
  doc.addPage();
  let newY = 6;
  if (compactHeader && model) {
    newY = drawCertificateHeader(doc, model, logoDataUrl, 6);
  }
  return { y: newY, pageAdded: true };
}

/** Campo com rótulo e valor sublinhado (estilo coleta). */
export function underlineField(doc, x, y, label, value, width) {
  doc.setFontSize(7.5);
  doc.setTextColor(...FORM_COLORS.text);
  const lbl = fieldLabelWithColon(label);
  doc.text(lbl, x, y);
  const x0 = x + doc.getTextWidth(lbl);
  const x1 = x + width;
  doc.setDrawColor(...FORM_COLORS.border);
  doc.line(x0, y + 1.1, x1, y + 1.1);
  const val = value == null ? "" : String(value);
  if (val) doc.text(val, x0 + 0.5, y);
  return y + 5;
}

/** Desenha lista numerada de observações legais. */
export function drawNumberedObservations(doc, x, y, observations, maxWidth) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(...FORM_COLORS.text);
  let cy = y;
  observations.forEach((text, i) => {
    const prefix = `${i + 1} - `;
    const lines = doc.splitTextToSize(prefix + text, maxWidth);
    doc.text(lines, x, cy);
    cy += lines.length * 3.2 + 1.5;
  });
  return cy;
}
