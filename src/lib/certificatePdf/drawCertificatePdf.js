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
  ({ y } = ensureSpace(doc, y, 32, ctx));
  y = drawSectionBar(doc, ML, y, CW, "DADOS DO CLIENTE");
  y = drawFieldGrid(doc, ML, y, CW, 2, [
    { label: "Cliente", value: model.client.name },
    { label: "C.N.P.J.", value: model.client.cnpj },
    { label: "Responsável", value: model.client.representative },
    { label: "Endereço", value: model.client.address },
    { label: "Cidade", value: model.client.city },
    { label: "Estado", value: model.client.state },
    { label: "Unidade", value: model.client.unit },
  ]);
  return y + 2;
}

function drawInstrumentSection(doc, model, y, ctx) {
  ({ y } = ensureSpace(doc, y, 58, ctx));
  y = drawSectionBar(doc, ML, y, CW, "INFORMAÇÕES TÉCNICAS");

  autoTable(doc, {
    startY: y,
    margin: { left: ML, right: PAGE_W - MR },
    head: [[
      "Tipo de Balança", "Fabricante", "Modelo", "Nº Série",
      "Faixa de Indicação", "Resolução", "Divisão de Verificação", "Unidade",
    ]],
    body: [[
      s(model.balance.tipo),
      s(model.balance.fabricante),
      s(model.balance.modelo),
      s(model.balance.serie),
      s(model.balance.capacidade),
      s(model.balance.resolucao),
      s(model.balance.divisao),
      s(model.balance.unidade),
    ]],
    styles: { fontSize: 6, cellPadding: 1.2, halign: "center" },
    headStyles: tableHeadStyles(doc),
    theme: "grid",
  });
  y = doc.lastAutoTable.finalY + 2;

  if (model.balance.capacidade2 || model.balance.resolucao2) {
    autoTable(doc, {
      startY: y,
      margin: { left: ML, right: PAGE_W - MR },
      head: [["", "C2", "C3", "d2", "d3", "e2", "e3", "Classe", "Ponto de Trabalho"]],
      body: [[
        "Faixas adicionais",
        s(model.balance.capacidade2),
        s(model.balance.capacidade3),
        s(model.balance.resolucao2),
        s(model.balance.resolucao3),
        s(model.balance.divisao2),
        s(model.balance.divisao3),
        s(model.balance.classe),
        s(model.balance.pontoTrabalho),
      ]],
      styles: { fontSize: 6, cellPadding: 1, halign: "center" },
      headStyles: tableHeadStyles(doc),
      theme: "grid",
    });
    y = doc.lastAutoTable.finalY + 2;
  }

  y = drawFieldGrid(doc, ML, y, CW, 2, [
    { label: "Local da Calibração", value: model.balance.local },
    { label: "Etiqueta IPEM", value: model.balance.etiqueta },
    { label: "Identificação", value: model.balance.identificacao || model.balance.tag },
    { label: "Tipo de Plataforma", value: model.balance.plataforma },
  ]);
  y += 2;
  y = underlineField(doc, ML, y, "Certificado número", model.certificateNumber, 55);
  y = underlineField(doc, ML + 60, y - 5, "Data da Calibração", model.calibrationDate, 45);
  y = underlineField(doc, ML + 110, y - 5, "Data de Validade", model.validityDate, 45);
  return y + 2;
}

function drawTraceabilitySection(doc, model, y, ctx) {
  return y;
}

function drawEnvironmentalSection(doc, model, y, ctx) {
  ({ y } = ensureSpace(doc, y, 38, ctx));
  y = drawSectionBar(doc, ML, y, CW, "CONDIÇÕES AMBIENTAIS - DURANTE A CALIBRAÇÃO");

  autoTable(doc, {
    startY: y,
    margin: { left: ML, right: PAGE_W - MR },
    head: [["", "Inicial", "Final", "Média ± incerteza"]],
    body: [
      ["Temperatura (ºC)", s(model.environmental.initialFinal.temperature.initial), s(model.environmental.initialFinal.temperature.final), s(model.environmental.temperature)],
      ["Umidade Relativa (%)", s(model.environmental.initialFinal.humidity.initial), s(model.environmental.initialFinal.humidity.final), s(model.environmental.humidity)],
      ["Pressão (hPa)", s(model.environmental.initialFinal.pressure.initial), s(model.environmental.initialFinal.pressure.final), s(model.environmental.pressure)],
    ],
    styles: { fontSize: 6.5, cellPadding: 1.2 },
    headStyles: tableHeadStyles(doc),
    theme: "grid",
  });
  y = doc.lastAutoTable.finalY + 3;
  y = underlineField(doc, ML, y, "Massa específica do ar", model.environmental.airDensity, 70);
  y = underlineField(doc, ML + 75, y - 5, "Referência", `${model.environmental.popReference || model.lab?.popCode || "POP-CAL-02"} Rev.`, CW - 78);

  if (model.instrumentStandards?.length) {
    y += 2;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.text("Termo-Higrômetro / Barômetro", ML, y);
    y += 3;
    autoTable(doc, {
      startY: y,
      margin: { left: ML, right: PAGE_W - MR },
      head: [["Identificação", "Nº cert.", "Data Calibração", "Validade"]],
      body: model.instrumentStandards.map((st) => [
        s(st.code),
        s(st.certificate),
        s(st.calibrationDate),
        s(st.validUntil),
      ]),
      styles: { fontSize: 6, cellPadding: 1 },
      headStyles: tableHeadStyles(doc),
      theme: "grid",
    });
    y = doc.lastAutoTable.finalY + 3;
  }

  if (model.weightStandards?.length) {
    y = drawSectionBar(doc, ML, y, CW, "PADRÕES DE REFERÊNCIA");
    autoTable(doc, {
      startY: y,
      margin: { left: ML, right: PAGE_W - MR },
      head: [["Identificação", "Nº cert.", "Data Calibração", "Validade", "Rastreabilidade"]],
      body: model.weightStandards.map((st) => [
        s(st.code),
        s(st.certificate),
        s(st.calibrationDate),
        s(st.validUntil),
        s(st.traceability),
      ]),
      styles: { fontSize: 6, cellPadding: 1 },
      headStyles: tableHeadStyles(doc),
      theme: "grid",
    });
    y = doc.lastAutoTable.finalY + 4;
  }

  return y + 2;
}

function drawRepeatabilityCalibrationSection(doc, model, y, ctx) {
  if (!model.points?.length) return y;
  const cols = model.points.slice(0, 10);

  ({ y } = ensureSpace(doc, y, 28, ctx));
  y = drawSectionBar(doc, ML, y, CW, "ENSAIO DE REPETIBILIDADE");

  const beforeHead = [[
    { content: "", rowSpan: 1 },
    ...cols.map((p) => ({ content: `${p.label}º ponto`, styles: { halign: "center" } })),
  ]];
  const beforeRows = [
    { label: "V.R.", key: (p) => p.referenceValue },
    { label: "Leitura 01", key: (p) => p.beforeAdjustment.l1 },
    { label: "Erro", key: (p) => p.beforeAdjustment.error },
  ].map((row) => [row.label, ...cols.map((p) => s(row.key(p)))]);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.text("Resultados Obtidos Antes do Ajuste", ML, y);
  y += 3;

  autoTable(doc, {
    startY: y,
    margin: { left: ML, right: PAGE_W - MR },
    head: beforeHead,
    body: beforeRows,
    styles: { fontSize: 5.5, cellPadding: 0.8, halign: "center", valign: "middle" },
    headStyles: { ...tableHeadStyles(doc), fontSize: 5.5 },
    columnStyles: { 0: { halign: "left", cellWidth: 22 } },
    theme: "grid",
  });
  y = doc.lastAutoTable.finalY + 4;

  ({ y } = ensureSpace(doc, y, 32, ctx));
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.text("Resultados Obtidos", ML, y);
  y += 3;

  const resultsHead = [[
    { content: "", rowSpan: 1 },
    ...cols.map((p) => ({ content: `${p.label}º ponto`, styles: { halign: "center" } })),
  ]];
  const resultsRows = [
    { label: "Leitura 1ª", key: (p) => p.readings.r1 },
    { label: "Leitura 2ª", key: (p) => p.readings.r2 },
    { label: "Leitura 3ª", key: (p) => p.readings.r3 },
    { label: "Média", key: (p) => p.results.average },
    { label: "Erro", key: (p) => p.results.indicationError },
    { label: "Incerteza Expandida", key: (p) => p.results.expandedUncertainty },
    { label: "Veff", key: (p) => p.results.veff },
    { label: "k", key: (p) => p.results.k },
  ].map((row) => [row.label, ...cols.map((p) => s(row.key(p)))]);

  autoTable(doc, {
    startY: y,
    margin: { left: ML, right: PAGE_W - MR },
    head: resultsHead,
    body: resultsRows,
    styles: { fontSize: 5.5, cellPadding: 0.8, halign: "center", valign: "middle" },
    headStyles: { ...tableHeadStyles(doc), fontSize: 5.5 },
    columnStyles: { 0: { halign: "left", cellWidth: 28 } },
    theme: "grid",
  });
  y = doc.lastAutoTable.finalY + 2;

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

function drawSubstitutionRepeatabilitySection(doc, model, y, ctx) {
  if (!model.substitutionRepeatability?.applicable || !model.substitutionRepeatability.rows?.length) return y;
  ({ y } = ensureSpace(doc, y, 25, ctx));
  y = drawSectionBar(doc, ML, y, CW, "REPETIBILIDADE COM LOTE DE CARGA");
  autoTable(doc, {
    startY: y,
    margin: { left: ML, right: PAGE_W - MR },
    head: [["Linha", "Valor nominal", "Leitura 1", "Leitura 2", "Leitura 3"]],
    body: model.substitutionRepeatability.rows.map((r) => [
      s(r.label), s(r.nominal), s(r.reading1), s(r.reading2), s(r.reading3),
    ]),
    styles: { fontSize: 6.5, cellPadding: 1.2 },
    headStyles: tableHeadStyles(doc),
    theme: "grid",
  });
  y = doc.lastAutoTable.finalY + 2;
  if (model.substitutionRepeatability.observations) {
    y = underlineField(doc, ML, y, "Observações", model.substitutionRepeatability.observations, CW);
  }
  return y + 2;
}

function drawObservationsSection(doc, model, y, ctx) {
  ({ y } = ensureSpace(doc, y, 44, ctx));
  y = drawSectionBar(doc, ML, y, CW, "OBSERVAÇÕES");
  y = drawNumberedObservations(doc, ML + 1, y + 1, model.observations, CW - 2) + 3;
  if (model.conformityDeclaration) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(model.conformityDeclaration, ML, y);
    y += 6;
  }
  return y;
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
  doc.text("SIGNATÁRIO", rightX + colW / 2, y, { align: "center" });
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
  doc.text(`Números de Pontos Calibrados: ${model.calibratedPointsCount}`, ML, y);
  doc.text(`Número de Leituras: ${model.readingsPerPoint}`, ML + 80, y);
  return y + 4;
}

export function drawCertificatePdf(doc, model, { logoDataUrl, signatureUrls, platformDiagrams } = {}) {
  const ctx = { model, logoDataUrl, compactHeader: true, platformDiagrams };
  let y = drawCertificateHeader(doc, model, logoDataUrl);

  y = drawClientSection(doc, model, y, ctx);
  y = drawInstrumentSection(doc, model, y, ctx);
  y = drawTraceabilitySection(doc, model, y, ctx);
  y = drawEnvironmentalSection(doc, model, y, ctx);
  y = drawEccentricitySection(doc, model, y, ctx);
  y = drawRepeatabilityCalibrationSection(doc, model, y, ctx);
  y = drawSubstitutionRepeatabilitySection(doc, model, y, ctx);
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
