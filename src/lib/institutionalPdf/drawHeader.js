import { displayValue, formatDateBr } from "@/lib/quotationRequestDisplay";
import { LOGO_H, LOGO_W, ML, MR, PAGE_W, TEXT } from "./theme";

/**
 * Cabeçalho institucional padrão (Pessoal 6.2).
 * @param {import("jspdf").jsPDF} doc
 * @param {{ title?: string, code?: string, reference?: string, revision?: string, modelIssueDate?: string }} header
 * @param {string|null|undefined} logoDataUrl
 * @param {number} [yStart=8]
 */
export function drawInstitutionalPdfHeader(doc, header, logoDataUrl, yStart = 8) {
  const y = yStart;
  const pageW = doc.internal?.pageSize?.getWidth?.() || PAGE_W;
  const rightX = pageW > PAGE_W ? pageW - 12 : MR - 2;
  const centerX = pageW / 2;
  const titleMaxWidth = pageW > PAGE_W ? 160 : 100;

  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, "PNG", ML, y, LOGO_W, LOGO_H);
    } catch { /* optional */ }
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...TEXT);
  doc.text(displayValue(header.title), centerX, y + 6, { align: "center", maxWidth: titleMaxWidth });

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

/**
 * Cabeçalho com linhas centrais extras (Pedido de Compra, Solicitação de Orçamento).
 * @param {import("jspdf").jsPDF} doc
 * @param {string|null|undefined} logoDataUrl
 * @param {number} [yStart=8]
 * @param {{
 *   title: string,
 *   titleFontSize?: number,
 *   centerLines?: Array<{ text: string, bold?: boolean, fontSize?: number, maxWidth?: number }>,
 *   metaLines: string[],
 *   minBottom?: number,
 * }} config
 */
export function drawInstitutionalPdfHeaderWithCenterLines(doc, logoDataUrl, yStart, config) {
  const y = yStart;
  const rightX = MR - 2;
  const centerX = PAGE_W / 2;

  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, "PNG", ML, y, LOGO_W, LOGO_H);
    } catch { /* optional */ }
  }

  let centerY = y + 6;
  const titleSize = config.titleFontSize ?? 12;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(titleSize);
  doc.setTextColor(...TEXT);
  doc.text(config.title, centerX, centerY, { align: "center", maxWidth: 100 });
  centerY += titleSize >= 12 ? 5 : 4;

  for (const line of config.centerLines || []) {
    doc.setFont("helvetica", line.bold ? "bold" : "normal");
    doc.setFontSize(line.fontSize ?? 8);
    doc.text(line.text, centerX, centerY, { align: "center", maxWidth: line.maxWidth ?? 100 });
    centerY += (line.fontSize ?? 8) > 8 ? 5 : 4.5;
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  let ry = y + 4;
  for (const line of config.metaLines) {
    doc.text(line, rightX, ry, { align: "right" });
    ry += 4.5;
  }

  const minBottom = config.minBottom ?? 20;
  return Math.max(y + LOGO_H + 2, ry + 2, centerY + 2, y + minBottom);
}

/**
 * Cabeçalho simplificado para relatórios (cadastro, documentos).
 * @param {import("jspdf").jsPDF} doc
 * @param {{ title: string, subtitle?: string }} header
 * @param {number} [yStart=14]
 */
export function drawInstitutionalReportHeader(doc, header, yStart = 14) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...TEXT);
  doc.text(header.title, ML, yStart);

  if (header.subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(header.subtitle, ML, yStart + 8);
    return yStart + 16;
  }
  return yStart + 10;
}
