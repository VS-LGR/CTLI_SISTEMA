import autoTable from "jspdf-autotable";
import { displayValue } from "@/lib/quotationRequestDisplay";
import { PERSONNEL_PDF_MARGINS, ensurePersonnelSpace } from "./drawPersonnelPdfHeader";

const { ML, MR } = PERSONNEL_PDF_MARGINS;
const HEADER_GRAY = [217, 217, 217];
const TEXT = [30, 30, 30];

export function drawLabelValueTable(doc, y, rows) {
  autoTable(doc, {
    startY: y,
    margin: { left: ML, right: 210 - MR },
    theme: "grid",
    styles: { fontSize: 8, cellPadding: 2, textColor: TEXT },
    headStyles: { fillColor: HEADER_GRAY, fontStyle: "bold" },
    body: rows.map(([label, value]) => [label, displayValue(value)]),
    columnStyles: { 0: { cellWidth: 55 } },
  });
  return doc.lastAutoTable.finalY + 4;
}

export function drawSectionTitle(doc, y, title) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...TEXT);
  doc.text(title, ML, y);
  return y + 5;
}

export function drawSectionBlock(doc, y, title, content, redrawHeader, header, logoDataUrl) {
  let cy = ensurePersonnelSpace(doc, y, 20, redrawHeader, header, logoDataUrl);
  cy = drawSectionTitle(doc, cy, title);
  const lines = doc.splitTextToSize(displayValue(content), MR - ML);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  for (const line of lines) {
    cy = ensurePersonnelSpace(doc, cy, 6, redrawHeader, header, logoDataUrl);
    doc.text(line, ML, cy);
    cy += 4;
  }
  return cy + 3;
}

export function drawListSection(doc, y, title, items, redrawHeader, header, logoDataUrl) {
  const text = Array.isArray(items) ? items.join("\n") : displayValue(items);
  return drawSectionBlock(doc, y, title, text || "-", redrawHeader, header, logoDataUrl);
}

export function drawAuthBlock(doc, y, text, redrawHeader, header, logoDataUrl) {
  return drawSectionBlock(doc, y, "Autorização de Ocupação do Cargo e suas Responsabilidades", text, redrawHeader, header, logoDataUrl);
}

export function drawSignatureRow(doc, y, leftLabel, rightLabel, leftUrl, rightUrl, redrawHeader, header, logoDataUrl) {
  let cy = ensurePersonnelSpace(doc, y, 35, redrawHeader, header, logoDataUrl);
  const colW = (MR - ML) / 2 - 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(leftLabel, ML, cy);
  doc.text(rightLabel, ML + colW + 8, cy);
  cy += 5;
  const sigH = 14;
  const drawSig = (url, x) => {
    if (url) {
      try {
        doc.addImage(url, "PNG", x, cy, colW, sigH);
        return;
      } catch { /* fallthrough */ }
    }
    doc.setDrawColor(120, 120, 120);
    doc.line(x, cy + sigH, x + colW, cy + sigH);
  };
  drawSig(leftUrl, ML);
  drawSig(rightUrl, ML + colW + 8);
  return cy + sigH + 8;
}
