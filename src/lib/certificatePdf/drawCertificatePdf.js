import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { buildCertificatePdfViewModel } from "./viewModel";
import {
  ML,
  MR,
  PAGE_W,
  CW,
  FORM_COLORS,
  drawCertificateHeader,
  drawCertificateDocumentFooters,
  drawSectionBar,
  drawFieldGrid,
  drawMeasureBlock,
  ensureSpace,
  underlineField,
  drawNumberedObservations,
  tableHeadStyles,
} from "./certificatePdfLayout";

function s(v) {
  return v == null ? "" : String(v);
}

function drawWatermark(doc, text) {
  const pages = doc.internal.getNumberOfPages();
  for (let p = 1; p <= pages; p += 1) {
    doc.setPage(p);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(28);
    doc.setTextColor(220, 38, 38);
    doc.text(text, PAGE_W / 2, 148, { align: "center", angle: 35 });
    doc.setTextColor(0, 0, 0);
  }
}

function drawClientSection(doc, model, y, ctx) {
  ({ y } = ensureSpace(doc, y, 28, ctx));
  y = drawSectionBar(doc, ML, y, CW, "DADOS DO CLIENTE");
  y = drawFieldGrid(doc, ML, y, CW, 2, [
    { label: "Cliente", value: model.client.name },
    { label: "C.N.P.J.", value: model.client.cnpj },
    { label: "Endereço", value: model.client.address },
    { label: "Cidade", value: model.client.city },
  ]);
  if (model.client.website || model.tenantWebsite) {
    doc.setFontSize(7);
    doc.text(model.client.website || model.tenantWebsite, ML, y);
    y += 4;
  }
  return y + 2;
}

function drawTechnicalSection(doc, model, y, ctx) {
  ({ y } = ensureSpace(doc, y, 42, ctx));
  y = drawSectionBar(doc, ML, y, CW, "INFORMAÇÕES TÉCNICAS");
  y = drawFieldGrid(doc, ML, y, CW, 3, [
    { label: "Marca", value: model.balance.fabricante },
    { label: "Modelo", value: model.balance.modelo },
    { label: "Número de Série", value: model.balance.serie },
    { label: "TAG", value: model.balance.tag },
    { label: "Tipo de Balança", value: model.balance.tipo },
    { label: "Etiqueta INMETRO", value: model.balance.etiqueta },
    { label: "Faixa de Indicação", value: model.balance.faixa },
    { label: "Resolução", value: model.balance.resolucao ? `${model.balance.resolucao} ${model.unit}` : "" },
    { label: "Unidade", value: model.balance.unidade },
    { label: "Local da Calibração", value: model.balance.local },
    { label: "Tipo de Plataforma", value: model.balance.plataforma },
    { label: "Validação", value: model.calibrationDate ? model.calibrationDate.split("/").pop() : "" },
  ]);
  y = underlineField(doc, ML, y, "Certificado número", model.certificateNumber, 55);
  y = underlineField(doc, ML + 60, y - 5, "Data da Calibração", model.calibrationDate, 45);
  y = underlineField(doc, ML + 110, y - 5, "Data de Validade", model.validityDate, 45);
  return y + 2;
}

function drawEnvironmentalSection(doc, model, y, ctx) {
  ({ y } = ensureSpace(doc, y, 30, ctx));
  y = drawSectionBar(doc, ML, y, CW, "CONDIÇÕES AMBIENTAIS DURANTE A CALIBRAÇÃO");
  doc.setFontSize(7.5);
  doc.setTextColor(...FORM_COLORS.text);
  y = underlineField(doc, ML, y + 2, "Estado", model.environmental.state, 40);
  const colW = (CW - 4) / 2;
  const yLeft = drawMeasureBlock(doc, ML, y, colW, "Temperatura", model.environmental.temperature);
  const yRight = drawMeasureBlock(doc, ML + colW + 4, y, colW, "Umidade Relativa", model.environmental.humidity);
  y = Math.max(yLeft, yRight);
  y = drawMeasureBlock(doc, ML, y, CW, "Pressão Atmosférica", model.environmental.pressure);
  y = underlineField(doc, ML, y, "Massa específica do ar", model.environmental.airDensity, 70);
  y = underlineField(doc, ML + 75, y - 5, "Termo-baro-higrômetro", model.environmental.thermoHygrometer, CW - 78);
  return y + 2;
}

function drawStandardsSection(doc, model, y, ctx) {
  if (!model.standards?.length) return y;
  ({ y } = ensureSpace(doc, y, 20, ctx));
  y = drawSectionBar(doc, ML, y, CW, "PADRÕES DE REFERÊNCIA - RASTREABILIDADE");
  autoTable(doc, {
    startY: y,
    margin: { left: ML, right: PAGE_W - MR },
    head: [["Número do Certificado", "Data de Calibração", "Data de Validade", "Rastreabilidade"]],
    body: model.standards.map((st) => [
      s(st.certificate),
      s(st.calibrationDate),
      s(st.validUntil),
      s(st.traceability),
    ]),
    styles: { fontSize: 6.5, cellPadding: 1.2, lineWidth: 0.1 },
    headStyles: tableHeadStyles(doc),
    theme: "grid",
  });
  return doc.lastAutoTable.finalY + 4;
}

function drawResultsTables(doc, model, y, ctx) {
  if (!model.points?.length) return y;
  ({ y } = ensureSpace(doc, y, 35, ctx));

  const th = tableHeadStyles(doc);
  const halfW = (CW - 4) / 2;
  const leftMargin = ML;
  const rightMargin = ML + halfW + 4;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("Resultados Obtidos Antes do Ajuste", leftMargin + halfW / 2, y, { align: "center" });
  doc.text("Resultados Obtidos", rightMargin + halfW / 2, y, { align: "center" });
  y += 4;

  const beforeBody = model.points.map((p) => [
    s(p.referenceValue),
    s(p.beforeAdjustment.l1),
    s(p.beforeAdjustment.error),
  ]);
  const resultsBody = model.points.map((p) => [
    s(p.referenceValue),
    s(p.results.average),
    s(p.results.indicationError),
    s(p.results.expandedUncertainty),
    s(p.results.veff),
    s(p.results.k),
  ]);

  autoTable(doc, {
    startY: y,
    margin: { left: leftMargin, right: PAGE_W - leftMargin - halfW },
    tableWidth: halfW,
    head: [[
      { content: "Valor de Referência\n(v.r)", rowSpan: 2 },
      { content: "Leitura 01\n(l1)", rowSpan: 2 },
      { content: "Erro de Indicação\n(l1-v.r)", rowSpan: 2 },
    ]],
    body: beforeBody,
    styles: { fontSize: 6, cellPadding: 1, halign: "center", valign: "middle" },
    headStyles: { ...th, fontSize: 5.5 },
    theme: "grid",
  });
  const yAfterLeft = doc.lastAutoTable.finalY;

  autoTable(doc, {
    startY: y,
    margin: { left: rightMargin, right: PAGE_W - MR },
    tableWidth: halfW,
    head: [[
      { content: "Valor de Referência\n(v.r)", rowSpan: 2 },
      { content: "Média das Leituras\n(X)", rowSpan: 2 },
      { content: "Erro de Indicação\n(X-v.r)", rowSpan: 2 },
      { content: "Incerteza Expandida\n(Ue)", rowSpan: 2 },
      { content: "Veff", rowSpan: 2 },
      { content: "k", rowSpan: 2 },
    ]],
    body: resultsBody,
    styles: { fontSize: 5.5, cellPadding: 0.8, halign: "center", valign: "middle" },
    headStyles: { ...th, fontSize: 5 },
    columnStyles: {
      3: { cellWidth: 18 },
      4: { cellWidth: 10 },
      5: { cellWidth: 8 },
    },
    theme: "grid",
  });

  y = Math.max(yAfterLeft, doc.lastAutoTable.finalY) + 2;

  if (model.adjustmentNote) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7);
    doc.text(model.adjustmentNote, ML, y);
    y += 5;
  }
  return y;
}

function drawVectorEccentricityFallback(doc, x, y, w) {
  doc.setFontSize(6);
  doc.text("Local na plataforma\nonde foi aplicada a carga", x, y);
  const cx = x + w / 2;
  const cy = y + 14;
  doc.setDrawColor(...FORM_COLORS.border);
  doc.rect(cx - 12, cy - 8, 24, 16, "S");
  [[0, -6], [-8, 4], [8, 4], [-8, -4], [8, -4]].forEach(([dx, dy], i) => {
    doc.circle(cx + dx, cy + dy, 2.5, "S");
    doc.text(String(i + 1), cx + dx - 1, cy + dy + 1);
  });
  return y + 24;
}

function drawPlatformDiagramStrip(doc, model, y, ctx) {
  const platformDiagrams = ctx.platformDiagrams;
  if (!platformDiagrams?.ok || !platformDiagrams.panels?.length) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...FORM_COLORS.text);
    doc.text("Tipos de Plataforma", ML, y);
    y += 4;
    return drawVectorEccentricityFallback(doc, ML, y, CW);
  }

  const gap = 2;
  const colCount = platformDiagrams.panels.length;
  const colW = (CW - gap * (colCount - 1)) / colCount;
  const imgH = 22;
  const labelH = 5;
  const stripH = imgH + labelH + 4;

  ({ y } = ensureSpace(doc, y, stripH + 4, ctx));

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...FORM_COLORS.text);
  doc.text("Tipos de Plataforma", ML, y);
  y += 4;

  platformDiagrams.panels.forEach((panel, i) => {
    const x = ML + i * (colW + gap);
    const active = panel.id === platformDiagrams.activePanelId;
    const boxH = imgH + 2;

    if (active) {
      doc.setFillColor(...FORM_COLORS.fieldLabelGreen);
      doc.rect(x, y, colW, boxH + labelH, "F");
    }

    doc.setDrawColor(...(active ? FORM_COLORS.brand : FORM_COLORS.border));
    doc.setLineWidth(active ? 0.35 : 0.12);
    doc.rect(x, y, colW, boxH, "S");

    if (panel.dataUrl) {
      try {
        const pad = 1;
        const maxW = colW - pad * 2;
        const maxH = imgH;
        const aspect = panel.aspectRatio > 0 ? panel.aspectRatio : 1;
        let drawW = maxW;
        let drawH = drawW / aspect;
        if (drawH > maxH) {
          drawH = maxH;
          drawW = drawH * aspect;
        }
        const drawX = x + pad + (maxW - drawW) / 2;
        const drawY = y + pad + (maxH - drawH) / 2;
        doc.addImage(panel.dataUrl, "PNG", drawX, drawY, drawW, drawH);
      } catch { /* fallback silencioso */ }
    }

    doc.setFont("helvetica", active ? "bold" : "normal");
    doc.setFontSize(5.5);
    doc.setTextColor(...FORM_COLORS.text);
    const label = panel.displayLabel || panel.label;
    doc.text(label, x + colW / 2, y + boxH + 3.5, { align: "center", maxWidth: colW - 2 });
  });

  doc.setLineWidth(0.12);
  return y + stripH;
}

function drawEccentricitySection(doc, model, y, ctx) {
  if (!model.eccentricity?.applicable) return y;
  ({ y } = ensureSpace(doc, y, 55, ctx));
  y = drawSectionBar(doc, ML, y, CW, "ENSAIO DE EXCENTRICIDADE");

  doc.setFontSize(7.5);
  y = underlineField(doc, ML, y + 2, "Valor Aplicado", model.eccentricity.appliedValue, 50);
  y += 2;

  y = drawPlatformDiagramStrip(doc, model, y, ctx);
  y += 2;

  autoTable(doc, {
    startY: y,
    margin: { left: ML, right: PAGE_W - MR },
    head: [["Ponto", "Antes do ajuste", "Depois do ajuste"]],
    body: model.eccentricity.points.map((pt) => [String(pt.number), s(pt.before), s(pt.after)]),
    styles: { fontSize: 6.5, cellPadding: 1.2 },
    headStyles: tableHeadStyles(doc),
    theme: "grid",
  });
  return doc.lastAutoTable.finalY + 4;
}

function drawRepeatabilitySection(doc, model, y, ctx) {
  if (!model.repeatability?.applicable || !model.repeatability.rows?.length) return y;
  ({ y } = ensureSpace(doc, y, 25, ctx));
  y = drawSectionBar(doc, ML, y, CW, "ENSAIO DE REPETIBILIDADE");
  autoTable(doc, {
    startY: y,
    margin: { left: ML, right: PAGE_W - MR },
    head: [["Linha", "Valor nominal", "Leitura 1", "Leitura 2", "Leitura 3"]],
    body: model.repeatability.rows.map((r) => [
      s(r.label), s(r.nominal), s(r.reading1), s(r.reading2), s(r.reading3),
    ]),
    styles: { fontSize: 6.5, cellPadding: 1.2 },
    headStyles: tableHeadStyles(doc),
    theme: "grid",
  });
  y = doc.lastAutoTable.finalY + 2;
  if (model.repeatability.observations) {
    y = underlineField(doc, ML, y, "Observações", model.repeatability.observations, CW);
  }
  return y + 2;
}

function drawObservationsSection(doc, model, y, ctx) {
  ({ y } = ensureSpace(doc, y, 40, ctx));
  y = drawSectionBar(doc, ML, y, CW, "OBSERVAÇÕES");
  return drawNumberedObservations(doc, ML + 1, y + 1, model.observations, CW - 2) + 3;
}

function drawApprovalBlock(doc, model, y, ctx, signatureUrls = {}) {
  ({ y } = ensureSpace(doc, y, 38, ctx));

  const colW = (CW - 8) / 2;
  const leftX = ML;
  const rightX = ML + colW + 8;
  const sigH = 10;
  const sigW = 25;

  const drawSignature = (x, sigY, url) => {
    if (!url) return;
    try {
      doc.addImage(url, "PNG", x, sigY, sigW, sigH);
    } catch { /* opcional */ }
  };

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text("Técnico Responsável", leftX + colW / 2, y, { align: "center" });
  doc.text("Aprovação", rightX + colW / 2, y, { align: "center" });
  y += 4;

  drawSignature(leftX + colW / 2 - sigW / 2, y, signatureUrls.executor);
  drawSignature(rightX + colW / 2 - sigW / 2, y, signatureUrls.signatory);
  y += sigH + 2;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text(s(model.executorName), leftX + colW / 2, y, { align: "center" });
  doc.text(s(model.signatoryName), rightX + colW / 2, y, { align: "center" });
  y += 5;

  y = underlineField(doc, leftX, y, "Data da calibração", model.calibrationDate, colW - 2);
  y = underlineField(doc, rightX, y - 5, "Data da emissão do Certificado", model.issueDate || model.approvalDate, colW - 2);

  y += 4;
  doc.setFontSize(7);
  doc.text(`Pontos Calibrados: ${model.calibratedPointsCount}`, ML, y);
  doc.text(`Números de Leituras: ${model.readingsPerPoint}`, ML + 80, y);
  return y + 4;
}

export function drawCertificatePdf(doc, model, { logoDataUrl, signatureUrls, platformDiagrams } = {}) {
  const ctx = { model, logoDataUrl, compactHeader: true, platformDiagrams };
  let y = drawCertificateHeader(doc, model, logoDataUrl);

  y = drawClientSection(doc, model, y, ctx);
  y = drawTechnicalSection(doc, model, y, ctx);
  y = drawEnvironmentalSection(doc, model, y, ctx);
  y = drawStandardsSection(doc, model, y, ctx);
  y = drawResultsTables(doc, model, y, ctx);
  y = drawEccentricitySection(doc, model, y, ctx);
  y = drawRepeatabilitySection(doc, model, y, ctx);
  y = drawObservationsSection(doc, model, y, ctx);
  drawApprovalBlock(doc, model, y, ctx, signatureUrls);

  drawCertificateDocumentFooters(doc, model);

  if (model.preview) drawWatermark(doc, "PRÉVIA TÉCNICA");
  if (model.cancelled) drawWatermark(doc, "CANCELADO");
}

export async function renderCertificatePdf(cert, tenantName, opts = {}) {
  const model = buildCertificatePdfViewModel(cert, opts);
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  drawCertificatePdf(doc, model, opts);
  const name = opts.fileName || `certificado-${cert.certificate_number || cert.id?.slice(0, 8)}.pdf`;
  doc.save(name);
}
