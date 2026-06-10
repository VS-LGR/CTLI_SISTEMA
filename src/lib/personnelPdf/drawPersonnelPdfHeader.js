import { displayValue, formatDateBr } from "@/lib/quotationRequestDisplay";

const ML = 10;
const MR = 200;
const PAGE_W = 210;
const TEXT = [30, 30, 30];
const LOGO_W = 32;
const LOGO_H = 13;

export const PERSONNEL_PDF_MARGINS = { ML, MR, PAGE_W };

export function drawPersonnelPdfHeader(doc, header, logoDataUrl, yStart = 8) {
  const y = yStart;
  const rightX = MR - 2;
  const centerX = PAGE_W / 2;

  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, "PNG", ML, y, LOGO_W, LOGO_H);
    } catch { /* optional */ }
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...TEXT);
  doc.text(displayValue(header.title), centerX, y + 6, { align: "center", maxWidth: 100 });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  let ry = y + 4;
  const emission = formatDateBr(header.modelIssueDate);
  const metaLines = [
    `Cód.: ${displayValue(header.code)}`,
    `Ref.: ${displayValue(header.reference)}`,
    `Rev.: ${displayValue(header.revision)}`,
    `Emissão: ${emission}`,
  ];
  for (const line of metaLines) {
    doc.text(line, rightX, ry, { align: "right" });
    ry += 4.5;
  }

  return Math.max(y + LOGO_H + 2, ry + 2, y + 18);
}

export function drawPersonnelPageFooters(doc) {
  const total = doc.internal.getNumberOfPages();
  for (let p = 1; p <= total; p += 1) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...TEXT);
    const y = 287;
    doc.text(`N.PÁG.: ${p} / ${total}`, MR, y, { align: "right" });
  }
}

export function ensurePersonnelSpace(doc, y, needed, redrawHeader, header, logoDataUrl) {
  if (y + needed > 275) {
    doc.addPage();
    return redrawHeader(doc, header, logoDataUrl, 8) + 4;
  }
  return y;
}
