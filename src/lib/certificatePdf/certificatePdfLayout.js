/**
 * Layout visual do certificado RE-7.2B — paleta cinza institucional.
 */

import { formatDateBr } from "@/lib/quotationRequestDisplay";
import { FORM_COLORS } from "./certificatePdfColors";
import { companyFromSources, drawGuideSectionTitle, drawHtmlFormFooters, drawHtmlFormHeader } from "@/lib/institutionalPdf/htmlFormChrome";
import {
  HTML_FORM,
  ML as THEME_ML,
  MR as THEME_MR,
  PAGE_W as THEME_PAGE_W,
  PAGE_H as THEME_PAGE_H,
  FOOTER_Y as THEME_FOOTER_Y,
  CONTENT_BOTTOM as THEME_CONTENT_BOTTOM,
  LOGO_W as THEME_LOGO_W,
  LOGO_H as THEME_LOGO_H,
  SPACING,
} from "@/lib/institutionalPdf/theme";

export { FORM_COLORS };

export const ML = THEME_ML;
export const MR = THEME_MR;
export const PAGE_W = THEME_PAGE_W;
export const PAGE_H = THEME_PAGE_H;
export const CW = MR - ML;
export const FOOTER_Y = THEME_FOOTER_Y;
export const CONTENT_BOTTOM = THEME_CONTENT_BOTTOM;
export const LOGO_W = THEME_LOGO_W;
export const LOGO_H = THEME_LOGO_H;

/** Rótulo de campo com dois-pontos (ex.: "Representante do Cliente: "). */
export function fieldLabelWithColon(label) {
  const t = String(label ?? "").trim();
  if (!t) return "";
  return t.endsWith(":") ? `${t} ` : `${t}: `;
}

const SECTION_BAR_H = SPACING.sectionBarH;
const SECTION_CONTENT_GAP = SPACING.sectionGap;
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
    fillColor: HTML_FORM.titleBar,
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
  return drawGuideSectionTitle(doc, x, y, width, text, m.sectionTitleFontSize) + (m.singlePage ? 0.4 : 0.8);
}

/** Campo com rótulo e área de valor. */
function drawFieldBox(doc, x, y, w, label, value, metrics = null) {
  const m = metrics || getCertificateLayoutMetrics(false);
  doc.setFillColor(...HTML_FORM.label);
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
  doc.setFillColor(...HTML_FORM.label);
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

/** @returns {number} y para início do conteúdo após cabeçalho */
export function drawCertificateHeader(doc, model, logoDataUrl, yStart = 8, metrics = null) {
  const identity = model.documentMeta || model.document || {};
  const withControl = !model._controlDrawn;
  model._controlDrawn = true;
  const emission = formatDateBr(identity.modelIssueDate || identity.issueDate);
  let y = drawHtmlFormHeader(doc, {
    logoDataUrl,
    company: companyFromSources({
      tenant: model.tenant,
      lab: model.lab,
      fallbackName: model.tenantName,
    }),
    title: model.certificateTitle || "CERTIFICADO DE CALIBRAÇÃO",
    code: identity.code || "",
    reference: identity.reference || "",
    revision: identity.revision || "",
    emission: emission && emission !== "—" ? emission : "",
    elaborado: identity.elaboratedBy || "",
    verificado: identity.verifiedBy || "",
    aprovado: identity.approvedBy || "",
    withControl,
    yStart,
  });

  const hasCredential = model.certificateType === "rbc"
    ? Boolean(model.lab?.cgcreCalNumber)
    : Boolean(model.lab?.ipemNumber);
  if (model.certificateType === "rbc" || hasCredential) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...FORM_COLORS.text);
    const acc = model.certificateType === "rbc"
      ? `RBC · Credenciado Cgcre/Inmetro${model.lab?.cgcreCalNumber ? ` · CAL ${model.lab.cgcreCalNumber}` : ""}`
      : `Credenciada IPEM-MG${model.lab?.ipemNumber ? ` · ${model.lab.ipemNumber}` : ""}`;
    const accLines = doc.splitTextToSize(acc, MR - ML);
    doc.text(accLines, ML, y + 3);
    y += accLines.length * 3.2 + 1.5;
  }

  const instance = [
    model.certificateNumber ? `Nº ${model.certificateNumber}` : "",
    model.proposalRef ? `Proposta ${model.proposalRef}` : "",
    model.collectionOsRef ? `O.S. ${model.collectionOsRef}` : "",
  ].filter(Boolean).join("   ·   ");
  if (instance) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(instance, ML, y + 3);
    y += 5;
  }
  return y + 1;
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
    doc.setFillColor(...HTML_FORM.label);
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
  const titleFont = compact ? 5.8 : 6.5;
  const lineH = compact ? 2.7 : 3.1;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(titleFont);
  doc.setTextColor(...FORM_COLORS.text);

  const leftLines = doc.splitTextToSize(leftText, Math.max(leftW - 0.5, 20));
  const rightLines = doc.splitTextToSize(rightText, Math.max(rightW - 0.5, 20));
  doc.text(leftLines, x, y);
  doc.text(rightLines, x + leftW + gap, y);

  let nextY = y + Math.max(leftLines.length, rightLines.length) * lineH + (compact ? 1.2 : 1.5);

  if (leftSubtitle) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(compact ? 5.4 : 6);
    const subLines = doc.splitTextToSize(leftSubtitle, leftW);
    doc.text(subLines, x, nextY + 0.4);
    nextY += subLines.length * (compact ? 2.7 : 3.1) + (compact ? 1.4 : 1.6);
  }

  return nextY + (compact ? 0.6 : 0.8);
}

/** Rodapé da casca HTML: código e revisão à esquerda, página à direita. */
export function drawCertificateDocumentFooters(doc, model) {
  const meta = model?.documentMeta || model?.document || {};
  drawHtmlFormFooters(doc, { code: meta.code || "", revision: meta.revision || "" });
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
