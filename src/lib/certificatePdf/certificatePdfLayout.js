/**
 * Layout visual do certificado RE-7.2B — paleta cinza institucional.
 */

import { formatDateBr } from "@/lib/quotationRequestDisplay";
import { pdfImageFormat } from "./compressPdfImages";
import { FORM_COLORS } from "./certificatePdfColors";

export { FORM_COLORS };

/** Rótulo de campo com dois-pontos (ex.: "Representante do Cliente: "). */
export function fieldLabelWithColon(label) {
  const t = String(label ?? "").trim();
  if (!t) return "";
  return t.endsWith(":") ? `${t} ` : `${t}: `;
}

const SECTION_BAR_H = 5;
const SECTION_CONTENT_GAP = 2.5;
const FIELD_LABEL_H = 3.5;
const FIELD_BOX_H = 7;

/** Métricas de layout — modo compacto para certificado emitido em uma página A4. */
export function getCertificateLayoutMetrics(singlePage = false) {
  if (!singlePage) {
    return {
      singlePage: false,
      sectionBarH: SECTION_BAR_H,
      sectionGap: SECTION_CONTENT_GAP,
      sectionTitleFontSize: 9,
      fieldLabelH: FIELD_LABEL_H,
      fieldBoxH: FIELD_BOX_H,
      fieldCellGap: 0.5,
      tableFontSize: 6,
      tableHeadFontSize: 5.5,
      tableCellPadding: 1.2,
      compactTableFontSize: 5.5,
      compactTablePadding: 0.8,
      compactTableHeadFontSize: 5.5,
      platformImgH: 26,
      platformLabelH: 4.5,
      observationFontSize: 6.5,
      observationLineH: 3.2,
      observationGap: 1.5,
      observationColumns: 1,
      metaLineH: 4.2,
      metaFontSize: 6.5,
      signatureH: 9,
      headerStartY: 6,
      logoW: LOGO_W,
      logoH: LOGO_H,
      clientGridCols: 3,
      measureHeaderH: 4.2,
      measureBodyH: 5.5,
      repeatabilityMinRows: 10,
      contentBottom: FOOTER_Y - 6,
    };
  }

  return {
    singlePage: true,
    sectionBarH: 3.8,
    sectionGap: 1.2,
    sectionTitleFontSize: 7.5,
    fieldLabelH: 3,
    fieldBoxH: 5.8,
    fieldCellGap: 0.35,
    tableFontSize: 5.1,
    tableHeadFontSize: 4.7,
    tableCellPadding: 0.55,
    compactTableFontSize: 4.5,
    compactTablePadding: 0.32,
    compactTableHeadFontSize: 4.3,
    platformImgH: 14,
    platformLabelH: 3,
    observationFontSize: 4.55,
    observationLineH: 2.25,
    observationGap: 0.45,
    observationColumns: 2,
    metaLineH: 3.1,
    metaFontSize: 5.8,
    signatureH: 6.5,
    headerStartY: 4,
    logoW: 26,
    logoH: 10,
    clientGridCols: 4,
    measureHeaderH: 3.6,
    measureBodyH: 4.8,
    repeatabilityMinRows: 5,
    contentBottom: FOOTER_Y - 2,
  };
}

/** @param {import('jspdf').jsPDF} doc */
export function tableHeadStyles(doc) {
  return {
    fillColor: FORM_COLORS.tableHeader,
    textColor: FORM_COLORS.text,
    fontStyle: "bold",
    lineWidth: 0.1,
  };
}

/**
 * Faixa de título de secção (y = topo da barra).
 * @returns {number} y para o primeiro conteúdo abaixo da barra
 */
export function drawSectionBar(doc, x, y, width, text, metrics = null) {
  const m = metrics || getCertificateLayoutMetrics(false);
  const barTop = y;
  doc.setFillColor(...FORM_COLORS.sectionBar);
  doc.rect(x, barTop, width, m.sectionBarH, "F");
  doc.setDrawColor(...FORM_COLORS.border);
  doc.setLineWidth(0.12);
  doc.rect(x, barTop, width, m.sectionBarH, "S");
  doc.setTextColor(...FORM_COLORS.sectionBarText);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(m.sectionTitleFontSize);
  doc.text(text, x + 1.5, barTop + m.sectionBarH - 1.4);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...FORM_COLORS.text);
  return barTop + m.sectionBarH + m.sectionGap;
}

/** Campo com rótulo e área de valor. */
function drawFieldBox(doc, x, y, w, label, value, metrics = null) {
  const m = metrics || getCertificateLayoutMetrics(false);
  doc.setFillColor(...FORM_COLORS.fieldLabel);
  doc.rect(x, y, w, m.fieldLabelH, "F");
  doc.setDrawColor(...FORM_COLORS.border);
  doc.setLineWidth(0.1);
  doc.rect(x, y, w, m.fieldBoxH, "S");
  doc.setFontSize(m.singlePage ? 5.5 : 6);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...FORM_COLORS.text);
  doc.text(label, x + 0.8, y + 2.1);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(m.singlePage ? 6 : 7);
  const val = value == null ? "" : String(value);
  const lines = doc.splitTextToSize(val || " ", w - 2);
  doc.text(lines.slice(0, 2), x + 0.8, y + m.fieldLabelH + 2.4);
}

/**
 * Grelha de campos (cols × rows).
 * @param {Array<{ label: string, value: string }>} fields
 */
export function drawFieldGrid(doc, x, y, totalWidth, cols, fields, metrics = null) {
  const m = metrics || getCertificateLayoutMetrics(false);
  const gap = m.singlePage ? 0.8 : 1.2;
  const cellW = (totalWidth - gap * (cols - 1)) / cols;
  const cellH = m.fieldBoxH + m.fieldCellGap;
  let maxY = y;
  fields.forEach((f, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cx = x + col * (cellW + gap);
    const cy = y + row * cellH;
    drawFieldBox(doc, cx, cy, cellW, f.label, f.value, m);
    maxY = Math.max(maxY, cy + m.fieldBoxH + m.fieldCellGap);
  });
  return maxY + (m.singlePage ? 0.8 : 2);
}

const MEASURE_BAR_H = 5;
const MEASURE_VALUE_GAP = 1.2;

/**
 * Bloco T/U/P: faixa com título + linha de valores abaixo.
 * @returns {number} y após o bloco
 */
export function drawMeasureBlock(doc, x, y, w, title, valueLine) {
  const barTop = y;
  doc.setFillColor(...FORM_COLORS.fieldLabel);
  doc.rect(x, barTop, w, MEASURE_BAR_H, "F");
  doc.setDrawColor(...FORM_COLORS.border);
  doc.setLineWidth(0.1);
  doc.rect(x, barTop, w, MEASURE_BAR_H, "S");
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...FORM_COLORS.text);
  doc.text(title, x + 0.5, barTop + 3.6, { maxWidth: w - 2 });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  const valueY = barTop + MEASURE_BAR_H + MEASURE_VALUE_GAP + 2.5;
  doc.text(valueLine, x + 0.5, valueY, { maxWidth: w - 2 });
  return valueY + 4.5;
}

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
export function drawCertificateHeader(doc, model, logoDataUrl, yStart = 6, metrics = null) {
  const m = metrics || getCertificateLayoutMetrics(false);
  const headerTop = yStart ?? m.headerStartY;
  const labX = ML;
  let labBottom = headerTop;

  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, pdfImageFormat(logoDataUrl), labX, headerTop, m.logoW, m.logoH);
      labBottom = headerTop + m.logoH + 0.5;
    } catch { /* opcional */ }
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(m.singlePage ? 5.8 : 6.5);
  doc.setTextColor(...FORM_COLORS.text);
  const labLines = [
    model.lab?.name || model.tenantName || "",
    model.lab?.address || "",
    [model.lab?.phone, model.lab?.website].filter(Boolean).join(" · "),
  ].filter(Boolean);
  const labLineH = m.singlePage ? 2.7 : 3.2;
  labLines.forEach((line, i) => {
    doc.text(line, labX, labBottom + 2.5 + i * labLineH, { maxWidth: 68 });
  });
  labBottom += labLines.length * labLineH + 1;

  const centerX = PAGE_W / 2;
  doc.setTextColor(...FORM_COLORS.text);
  doc.setFont("helvetica", "bold");
  const titleSuffix = model.certificateType === "rbc" ? " RBC" : "";
  doc.setFontSize(m.singlePage ? 9 : 10);
  doc.text(`CERTIFICADO DE CALIBRAÇÃO${titleSuffix}`, centerX, headerTop + (m.singlePage ? 6.5 : 8), { align: "center" });
  doc.setFontSize(m.singlePage ? 10 : 11);
  doc.text(`Nº ${model.certificateNumber || "—"}`, centerX, headerTop + (m.singlePage ? 12 : 15), { align: "center" });

  if (model.certificateType === "rbc") {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(m.singlePage ? 5 : 5.5);
    const accText = model.lab?.cgcreCalNumber
      ? `Laboratório de Calibração acreditado pela Cgcre de acordo com a NORMA ABNT NBR ISO/IEC 17025:2017, sob o número CAL ${model.lab.cgcreCalNumber}`
      : "Laboratório de Calibração acreditado pela Cgcre de acordo com a NORMA ABNT NBR ISO/IEC 17025:2017";
    doc.text(accText, centerX, headerTop + (m.singlePage ? 16 : 20), { align: "center", maxWidth: m.singlePage ? 115 : 120 });
  }

  const accX = PAGE_W - ML;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(m.singlePage ? 6 : 6.5);
  if (model.certificateType === "rbc") {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(m.singlePage ? 6.5 : 7);
    doc.text("RBC", accX, headerTop + 3.5, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(m.singlePage ? 5.5 : 6);
    doc.text("CREDENCIADO CGCRE/INMETRO", accX, headerTop + (m.singlePage ? 7.5 : 9), { align: "right" });
    doc.text("NBR ISO/IEC 17025:2017", accX, headerTop + (m.singlePage ? 11 : 13), { align: "right" });
    if (model.lab?.cgcreCalNumber) {
      doc.text(`CAL ${model.lab.cgcreCalNumber}`, accX, headerTop + (m.singlePage ? 14.5 : 17), { align: "right" });
    }
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(m.singlePage ? 6.5 : 7);
    doc.text("CREDENCIADA IPEM-MG", accX, headerTop + (m.singlePage ? 5 : 6), { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(m.singlePage ? 6 : 6.5);
    if (model.lab?.ipemNumber) {
      doc.text(model.lab.ipemNumber, accX, headerTop + (m.singlePage ? 9 : 11), { align: "right" });
    }
  }

  const headerBottom = model.certificateType === "rbc"
    ? headerTop + (m.singlePage ? 21 : 26)
    : headerTop + (m.singlePage ? 17 : 22);
  return Math.max(labBottom, headerBottom) + (m.singlePage ? 0.5 : 2);
}

/** Linha de medidas ambientais compactas (4 células lado a lado). */
export function drawCompactMeasureRow(doc, x, y, totalW, cells, metrics = null) {
  const m = metrics || getCertificateLayoutMetrics(false);
  const gap = m.singlePage ? 0.7 : 1;
  const count = Math.max(cells.length, 1);
  const cellW = (totalW - gap * (count - 1)) / count;
  const headerH = m.measureHeaderH ?? 4.2;
  const bodyH = m.measureBodyH ?? 5.5;

  cells.forEach((cell, i) => {
    const cx = x + i * (cellW + gap);
    doc.setFillColor(...FORM_COLORS.fieldLabel);
    doc.rect(cx, y, cellW, headerH, "F");
    doc.setDrawColor(...FORM_COLORS.border);
    doc.setLineWidth(0.1);
    doc.rect(cx, y, cellW, headerH + bodyH, "S");
    doc.line(cx, y + headerH, cx + cellW, y + headerH);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(m.singlePage ? 5 : 5.5);
    doc.setTextColor(...FORM_COLORS.text);
    doc.text(cell.label, cx + 0.4, y + headerH - 1.3, { maxWidth: cellW - 0.8 });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(m.singlePage ? 5.3 : 6);
    doc.text(cell.value || "—", cx + 0.4, y + headerH + (m.singlePage ? 2.8 : 3.5), { maxWidth: cellW - 0.8 });
  });

  doc.setLineWidth(0.12);
  return y + headerH + bodyH + (m.singlePage ? 1 : 2);
}

/** Duas faixas de título sobre tabelas lado a lado. */
export function drawDualSubsectionTitles(doc, x, y, leftText, rightText, leftW, rightW, gap = 2, leftSubtitle = "", metrics = null) {
  const m = metrics || getCertificateLayoutMetrics(false);
  const compact = m.singlePage;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(compact ? 6 : 6.5);
  doc.setTextColor(...FORM_COLORS.text);
  doc.text(leftText, x, y);
  doc.text(rightText, x + leftW + gap, y);
  let nextY = y + (compact ? 3.5 : 4);
  if (leftSubtitle) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(compact ? 5.5 : 6);
    const lines = doc.splitTextToSize(leftSubtitle, leftW);
    doc.text(lines, x, nextY + 0.5);
    nextY += lines.length * (compact ? 2.8 : 3.2) + (compact ? 1.2 : 1.5);
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
export function ensureSpace(doc, y, needed, ctx = {}) {
  const metrics = ctx.metrics || getCertificateLayoutMetrics(false);
  const bottom = metrics.contentBottom ?? CONTENT_BOTTOM;
  if (ctx.singlePage || metrics.singlePage) return { y, pageAdded: false };
  if (y + needed <= bottom) return { y, pageAdded: false };
  doc.addPage();
  let newY = metrics.headerStartY ?? 6;
  if (ctx.compactHeader !== false && ctx.model) {
    newY = drawCertificateHeader(doc, ctx.model, ctx.logoDataUrl, newY, metrics);
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
export function drawNumberedObservations(doc, x, y, observations, maxWidth, metrics = null) {
  const m = metrics || getCertificateLayoutMetrics(false);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(m.observationFontSize);
  doc.setTextColor(...FORM_COLORS.text);

  if (m.observationColumns === 2) {
    const gap = 2.5;
    const colW = (maxWidth - gap) / 2;
    const leftItems = observations.filter((_, i) => i % 2 === 0);
    const rightItems = observations.filter((_, i) => i % 2 === 1);

    const drawColumn = (items, startIndex, cx, startY) => {
      let cy = startY;
      items.forEach((text, idx) => {
        const num = startIndex + idx * 2 + 1;
        const lines = doc.splitTextToSize(`${num} - ${text}`, colW);
        doc.text(lines, cx, cy);
        cy += lines.length * m.observationLineH + m.observationGap;
      });
      return cy;
    };

    const leftEnd = drawColumn(leftItems, 0, x, y);
    const rightEnd = drawColumn(rightItems, 1, x + colW + gap, y);
    return Math.max(leftEnd, rightEnd);
  }

  let cy = y;
  observations.forEach((text, i) => {
    const prefix = `${i + 1} - `;
    const lines = doc.splitTextToSize(prefix + text, maxWidth);
    doc.text(lines, x, cy);
    cy += lines.length * m.observationLineH + m.observationGap;
  });
  return cy;
}
