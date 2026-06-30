/**
 * Layout visual do certificado RE-7.2B — reutiliza paleta e helpers da coleta RE-7.2A.
 */

import { formatDateBr } from "@/lib/quotationRequestDisplay";
import { pdfImageFormat } from "./compressPdfImages";
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
  const labX = ML;
  let labBottom = headerTop;

  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, pdfImageFormat(logoDataUrl), labX, headerTop, LOGO_W, LOGO_H);
      labBottom = headerTop + LOGO_H + 1;
    } catch { /* opcional */ }
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(...FORM_COLORS.text);
  const labLines = [
    model.lab?.name || model.tenantName || "",
    model.lab?.address || "",
    [model.lab?.phone, model.lab?.website].filter(Boolean).join(" · "),
  ].filter(Boolean);
  labLines.forEach((line, i) => {
    doc.text(line, labX, labBottom + 3 + i * 3.2, { maxWidth: 70 });
  });
  labBottom += labLines.length * 3.2 + 2;

  const centerX = PAGE_W / 2;
  doc.setTextColor(...FORM_COLORS.text);
  doc.setFont("helvetica", "bold");
  const titleSuffix = model.certificateType === "rbc" ? " RBC" : "";
  doc.setFontSize(10);
  doc.text(`CERTIFICADO DE CALIBRAÇÃO${titleSuffix}`, centerX, headerTop + 8, { align: "center" });
  doc.setFontSize(11);
  doc.text(`Nº ${model.certificateNumber || "—"}`, centerX, headerTop + 15, { align: "center" });

  if (model.certificateType === "rbc") {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.5);
    const accText = model.lab?.cgcreCalNumber
      ? `Laboratório de Calibração acreditado pela Cgcre de acordo com a NORMA ABNT NBR ISO/IEC 17025:2017, sob o número CAL ${model.lab.cgcreCalNumber}`
      : "Laboratório de Calibração acreditado pela Cgcre de acordo com a NORMA ABNT NBR ISO/IEC 17025:2017";
    doc.text(accText, centerX, headerTop + 20, { align: "center", maxWidth: 120 });
  }

  const accX = PAGE_W - ML;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  if (model.certificateType === "rbc") {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.text("RBC", accX, headerTop + 4, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.text("CREDENCIADO CGCRE/INMETRO", accX, headerTop + 9, { align: "right" });
    doc.text("NBR ISO/IEC 17025:2017", accX, headerTop + 13, { align: "right" });
    if (model.lab?.cgcreCalNumber) {
      doc.text(`CAL ${model.lab.cgcreCalNumber}`, accX, headerTop + 17, { align: "right" });
    }
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.text("CREDENCIADA IPEM-MG", accX, headerTop + 6, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    if (model.lab?.ipemNumber) {
      doc.text(model.lab.ipemNumber, accX, headerTop + 11, { align: "right" });
    }
  }

  return Math.max(labBottom, headerTop + (model.certificateType === "rbc" ? 26 : 22)) + 2;
}

/** Linha de medidas ambientais compactas (4 células lado a lado). */
export function drawCompactMeasureRow(doc, x, y, totalW, cells) {
  const gap = 1;
  const count = Math.max(cells.length, 1);
  const cellW = (totalW - gap * (count - 1)) / count;
  const headerH = 4.2;
  const bodyH = 5.5;

  cells.forEach((cell, i) => {
    const cx = x + i * (cellW + gap);
    doc.setFillColor(...FORM_COLORS.fieldLabelGreen);
    doc.rect(cx, y, cellW, headerH, "F");
    doc.setDrawColor(...FORM_COLORS.border);
    doc.setLineWidth(0.1);
    doc.rect(cx, y, cellW, headerH + bodyH, "S");
    doc.line(cx, y + headerH, cx + cellW, y + headerH);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(5.5);
    doc.setTextColor(...FORM_COLORS.text);
    doc.text(cell.label, cx + 0.4, y + 2.9, { maxWidth: cellW - 0.8 });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.text(cell.value || "—", cx + 0.4, y + headerH + 3.5, { maxWidth: cellW - 0.8 });
  });

  doc.setLineWidth(0.12);
  return y + headerH + bodyH + 2;
}

/** Duas faixas de título sobre tabelas lado a lado. */
export function drawDualSubsectionTitles(doc, x, y, leftText, rightText, leftW, rightW, gap = 2, leftSubtitle = "") {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(...FORM_COLORS.text);
  doc.text(leftText, x, y);
  doc.text(rightText, x + leftW + gap, y);
  let nextY = y + 3;
  if (leftSubtitle) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(6);
    doc.text(leftSubtitle, x, nextY + 1.5, { maxWidth: leftW });
    nextY += 5;
  }
  return nextY;
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
