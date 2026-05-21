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
 * Faixa verde de título de secção.
 * @returns {number} y após a barra
 */
export function drawSectionBar(doc, x, y, width, text) {
  doc.setFillColor(...FORM_COLORS.sectionGreen);
  doc.rect(x, y - 3.5, width, SECTION_BAR_H, "F");
  doc.setDrawColor(...FORM_COLORS.border);
  doc.setLineWidth(0.1);
  doc.rect(x, y - 3.5, width, SECTION_BAR_H, "S");
  doc.setTextColor(...FORM_COLORS.text);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(text, x + 1.5, y);
  doc.setFont("helvetica", "normal");
  return y + SECTION_BAR_H + 1.5;
}

/** Caixa proposta comercial (canto superior direito). */
export function drawProposalBox(doc, x, y, w, h, proposalRef) {
  doc.setDrawColor(...FORM_COLORS.border);
  doc.setLineWidth(0.2);
  doc.rect(x, y, w, h, "S");
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...FORM_COLORS.text);
  doc.text("Referente à Proposta Comercial:", x + 1.5, y + 3.5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  const ref = proposalRef ? String(proposalRef) : "";
  doc.text(ref || " ", x + 1.5, y + h - 2, { maxWidth: w - 3 });
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

/** Título pequeno com fundo verde (bloco ambiente T/U/P). */
export function drawMeasureTitleBar(doc, x, y, w, text) {
  doc.setFillColor(...FORM_COLORS.fieldLabelGreen);
  doc.rect(x, y, w, 4, "F");
  doc.setDrawColor(...FORM_COLORS.border);
  doc.rect(x, y, w, 4, "S");
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "bold");
  doc.text(text, x + 0.5, y + 2.8);
  doc.setFont("helvetica", "normal");
  return y + 5;
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

/** Três diagramas esquemáticos de plataforma. */
export function drawPlatformDiagrams(doc, x, y, totalW) {
  const gap = 3;
  const w = (totalW - gap * 2) / 3;
  const h = 14;
  drawRectPlatform(doc, x, y, w, h);
  drawRoundPlatform(doc, x + w + gap, y, w, h);
  drawTruckPlatform(doc, x + 2 * (w + gap), y, w, h);
  return y + h + 2;
}

function drawRectPlatform(doc, x, y, w, h) {
  doc.setFontSize(5);
  doc.setTextColor(...FORM_COLORS.text);
  const mx = x + w / 2;
  const my = y + h / 2;
  const rw = w * 0.55;
  const rh = h * 0.45;
  doc.setDrawColor(...FORM_COLORS.border);
  doc.rect(mx - rw / 2, my - rh / 2, rw, rh, "S");
  const pts = [
    [mx - rw / 2, my - rh / 2, "1"],
    [mx + rw / 2, my - rh / 2, "2"],
    [mx + rw / 2, my + rh / 2, "3"],
    [mx - rw / 2, my + rh / 2, "4"],
  ];
  pts.forEach(([px, py, n]) => {
    doc.circle(px, py, 0.8, "F");
    doc.text(n, px - 0.6, py + 0.5);
  });
}

function drawRoundPlatform(doc, x, y, w, h) {
  doc.setFontSize(5);
  const mx = x + w / 2;
  const my = y + h / 2;
  const r = Math.min(w, h) * 0.28;
  doc.setDrawColor(...FORM_COLORS.border);
  doc.circle(mx, my, r, "S");
  [[mx, my - r, "1"], [mx + r, my, "2"], [mx, my + r, "3"], [mx - r, my, "4"]].forEach(
    ([px, py, n]) => {
      doc.circle(px, py, 0.8, "F");
      doc.text(n, px - 0.6, py + 0.5);
    },
  );
}

function drawTruckPlatform(doc, x, y, w, h) {
  doc.setFontSize(5);
  const mx = x + w / 2;
  doc.setDrawColor(...FORM_COLORS.border);
  doc.line(x + 2, y + h - 2, x + w - 2, y + h - 2);
  doc.rect(mx - w * 0.2, y + 3, w * 0.4, h * 0.35, "S");
  doc.circle(x + 4, y + h - 2, 1.2, "F");
  doc.circle(x + w - 4, y + h - 2, 1.2, "F");
  doc.text("1", mx - 2, y + 5);
  doc.text("2", mx + 6, y + 5);
}
