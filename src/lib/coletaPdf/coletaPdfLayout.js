/**
 * Layout visual do formulário RE-7.2A (cores e helpers jsPDF).
 * Identidade do tenant (logo, código do formulário) vem de coletaDocMeta + export opts.
 */

export const FORM_COLORS = {
  sectionGreen: [198, 224, 180],
  tableHeaderGreen: [186, 216, 168],
  fieldLabelGreen: [198, 224, 180],
  controlRed: [255, 0, 0],
  border: [120, 120, 120],
  text: [0, 0, 0],
};

const SECTION_BAR_H = 5;
const SECTION_CONTENT_GAP = 2.5;
const FIELD_LABEL_H = 3.5;
const FIELD_BOX_H = 7;

/** @param {import('jspdf').jsPDF} doc */
export function tableHeadStyles(doc) {
  return {
    fillColor: FORM_COLORS.tableHeaderGreen,
    textColor: FORM_COLORS.text,
    fontStyle: "bold",
    lineWidth: 0.1,
  };
}

/**
 * Faixa verde de título de secção (y = topo da barra).
 * @returns {number} y para o primeiro conteúdo abaixo da barra
 */
export function drawSectionBar(doc, x, y, width, text) {
  const barTop = y;
  doc.setFillColor(...FORM_COLORS.sectionGreen);
  doc.rect(x, barTop, width, SECTION_BAR_H, "F");
  doc.setDrawColor(...FORM_COLORS.border);
  doc.setLineWidth(0.1);
  doc.rect(x, barTop, width, SECTION_BAR_H, "S");
  doc.setTextColor(...FORM_COLORS.text);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(text, x + 1.5, barTop + 3.6);
  doc.setFont("helvetica", "normal");
  return barTop + SECTION_BAR_H + SECTION_CONTENT_GAP;
}

/** Duas faixas lado a lado (secções 4 e 5). */
export function drawDualSectionBar(
  doc,
  x,
  y,
  leftText,
  rightText,
  leftW = 88,
  rightW = 92,
  gap = 10,
) {
  const barTop = y;
  const rightX = x + leftW + gap;
  doc.setFillColor(...FORM_COLORS.sectionGreen);
  doc.rect(x, barTop, leftW, SECTION_BAR_H, "F");
  doc.rect(rightX, barTop, rightW, SECTION_BAR_H, "F");
  doc.setDrawColor(...FORM_COLORS.border);
  doc.setLineWidth(0.1);
  doc.rect(x, barTop, leftW, SECTION_BAR_H, "S");
  doc.rect(rightX, barTop, rightW, SECTION_BAR_H, "S");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...FORM_COLORS.text);
  doc.text(leftText, x + 1.5, barTop + 3.6);
  doc.text(rightText, rightX + 1.5, barTop + 3.6);
  doc.setFont("helvetica", "normal");
  return barTop + SECTION_BAR_H + SECTION_CONTENT_GAP;
}

const PROPOSAL_PAD = 1.5;
const PROPOSAL_LABEL_H = 3.5;
const PROPOSAL_VALUE_GAP = 1.2;
const PROPOSAL_LINE_H = 3.2;
const PROPOSAL_MIN_H = 14;
const PROPOSAL_MAX_H = 22;

/**
 * Caixa proposta comercial (altura dinâmica; valor abaixo do rótulo).
 * @returns {number} altura da caixa em mm
 */
export function drawProposalBox(doc, x, y, w, proposalRef) {
  const innerW = w - PROPOSAL_PAD * 2;
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  const ref = proposalRef ? String(proposalRef) : "";
  const valueLines = doc.splitTextToSize(ref || " ", innerW);
  const valueH = Math.max(PROPOSAL_LINE_H, valueLines.length * PROPOSAL_LINE_H);
  let h =
    PROPOSAL_PAD + PROPOSAL_LABEL_H + PROPOSAL_VALUE_GAP + valueH + PROPOSAL_PAD;
  h = Math.min(PROPOSAL_MAX_H, Math.max(PROPOSAL_MIN_H, h));

  doc.setDrawColor(...FORM_COLORS.border);
  doc.setLineWidth(0.2);
  doc.rect(x, y, w, h, "S");
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...FORM_COLORS.text);
  doc.text("Referente à Proposta Comercial:", x + PROPOSAL_PAD, y + PROPOSAL_PAD + 2.6);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  const valueY = y + PROPOSAL_PAD + PROPOSAL_LABEL_H + PROPOSAL_VALUE_GAP + 2.2;
  doc.text(valueLines, x + PROPOSAL_PAD, valueY, { maxWidth: innerW });
  return h;
}

/**
 * Linha de equipamento (rótulo + identificação sublinhada) na coluna esquerda da sec. 3.
 * @returns {number} y após o bloco
 */
export function drawEquipamentoRow(doc, x, y, w, label, value) {
  const padX = 2;
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...FORM_COLORS.text);
  const labelLines = doc.splitTextToSize(label, w - padX);
  let cy = y + 2.5;
  labelLines.forEach((line) => {
    doc.text(line, x + padX, cy);
    cy += 3.2;
  });
  cy += 0.6;
  const valY = cy;
  const lineY = valY + 1.1;
  doc.setDrawColor(...FORM_COLORS.border);
  doc.setLineWidth(0.1);
  doc.line(x + padX, lineY, x + w - padX, lineY);
  const val = value == null ? "" : String(value).trim();
  if (val) {
    const valLines = doc.splitTextToSize(val, w - padX * 2);
    doc.text(valLines.slice(0, 2), x + padX + 0.5, valY);
    cy = valY + Math.min(valLines.length, 2) * 3.2;
  } else {
    cy = valY + 3.5;
  }
  return cy + 1.8;
}

/** Campo com rótulo verde e área de valor. */
export function drawFieldBox(doc, x, y, w, label, value) {
  doc.setFillColor(...FORM_COLORS.fieldLabelGreen);
  doc.rect(x, y, w, FIELD_LABEL_H, "F");
  doc.setDrawColor(...FORM_COLORS.border);
  doc.setLineWidth(0.1);
  doc.rect(x, y, w, FIELD_BOX_H, "S");
  doc.setFontSize(6);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...FORM_COLORS.text);
  doc.text(label, x + 0.8, y + 2.4);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  const val = value == null ? "" : String(value);
  const lines = doc.splitTextToSize(val || " ", w - 2);
  doc.text(lines.slice(0, 2), x + 0.8, y + FIELD_LABEL_H + 2.8);
}

/**
 * Grelha de campos (cols × rows).
 * @param {Array<{ label: string, value: string }>} fields
 */
export function drawFieldGrid(doc, x, y, totalWidth, cols, fields) {
  const gap = 1.2;
  const cellW = (totalWidth - gap * (cols - 1)) / cols;
  const cellH = FIELD_BOX_H + 0.5;
  let maxY = y;
  fields.forEach((f, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cx = x + col * (cellW + gap);
    const cy = y + row * cellH;
    drawFieldBox(doc, cx, cy, cellW, f.label, f.value);
    maxY = Math.max(maxY, cy + FIELD_BOX_H + 0.5);
  });
  return maxY + 2;
}

const MEASURE_BAR_H = 5;
const MEASURE_VALUE_GAP = 1.2;

/**
 * Bloco T/U/P: faixa verde com título + linha de valores abaixo (evita sobreposição).
 * @returns {number} y após o bloco
 */
export function drawMeasureBlock(doc, x, y, w, title, valueLine) {
  const barTop = y;
  doc.setFillColor(...FORM_COLORS.fieldLabelGreen);
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

/** Caixa de descrição (verso). */
export function drawDescricaoBox(doc, x, y, w, h, body) {
  doc.setDrawColor(...FORM_COLORS.border);
  doc.setLineWidth(0.1);
  doc.rect(x, y, w, h, "S");
  doc.setFontSize(8);
  doc.setTextColor(...FORM_COLORS.text);
  const lines = doc.splitTextToSize(body == null ? " " : String(body), w - 4);
  doc.text(lines, x + 2, y + 4);
  return y + h;
}
