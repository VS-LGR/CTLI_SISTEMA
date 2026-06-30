import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { buildCertificatePdfViewModel } from "./viewModel";
import { pdfImageFormat } from "./compressPdfImages";
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
  drawCompactMeasureRow,
  drawDualSubsectionTitles,
  ensureSpace,
  drawNumberedObservations,
  tableHeadStyles,
} from "./certificatePdfLayout";

function s(v) {
  return v == null ? "" : String(v);
}

function joinSlash(items) {
  const vals = (items || []).map((v) => s(v).trim()).filter(Boolean);
  return vals.length ? vals.join(" / ") : "—";
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
  y = drawFieldGrid(doc, ML, y, CW, 3, [
    { label: "Cliente", value: model.client.name },
    { label: "C.N.P.J.", value: model.client.cnpj },
    { label: "Responsável", value: model.client.representative },
    { label: "Endereço", value: model.client.address },
    { label: "Cidade", value: model.client.city },
    { label: "Estado", value: model.client.state },
    { label: "Unidade", value: model.client.unit },
  ]);
  return y + 1;
}

function drawInstrumentSection(doc, model, y, ctx) {
  ({ y } = ensureSpace(doc, y, 36, ctx));
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
    styles: { fontSize: 6, cellPadding: 1.2, halign: "center", valign: "middle" },
    headStyles: { ...tableHeadStyles(doc), fontSize: 5.5 },
    theme: "grid",
  });
  y = doc.lastAutoTable.finalY + 1;

  autoTable(doc, {
    startY: y,
    margin: { left: ML, right: PAGE_W - MR },
    head: [["Local da Calibração", "Etiqueta IPEM", "Identificação", "Tipo de Plataforma"]],
    body: [[
      s(model.balance.local),
      s(model.balance.etiqueta),
      s(model.balance.identificacao || model.balance.tag),
      s(model.balance.plataforma),
    ]],
    styles: { fontSize: 6, cellPadding: 1.2, halign: "center" },
    headStyles: { ...tableHeadStyles(doc), fontSize: 5.5 },
    theme: "grid",
  });
  y = doc.lastAutoTable.finalY + 2;

  if (model.balance.capacidade2 || model.balance.resolucao2) {
    autoTable(doc, {
      startY: y,
      margin: { left: ML, right: PAGE_W - MR },
      head: [["", "C2", "C3", "d2", "d3", "e2", "e3"]],
      body: [[
        "Faixas adicionais",
        s(model.balance.capacidade2),
        s(model.balance.capacidade3),
        s(model.balance.resolucao2),
        s(model.balance.resolucao3),
        s(model.balance.divisao2),
        s(model.balance.divisao3),
      ]],
      styles: { fontSize: 5.5, cellPadding: 1, halign: "center" },
      headStyles: tableHeadStyles(doc),
      theme: "grid",
    });
    y = doc.lastAutoTable.finalY + 2;
  }

  return y;
}

function drawEnvironmentalSection(doc, model, y, ctx) {
  ({ y } = ensureSpace(doc, y, 32, ctx));
  y = drawSectionBar(doc, ML, y, CW, "CONDIÇÕES AMBIENTAIS - DURANTE A CALIBRAÇÃO");

  y = drawCompactMeasureRow(doc, ML, y, CW, [
    { label: "Temperatura", value: model.environmental.temperature },
    { label: "Umidade Relativa", value: model.environmental.humidity },
    { label: "Pressão Atmosférica", value: model.environmental.pressure },
    { label: "Massa específica do ar", value: model.environmental.airDensity },
  ]);

  if (model.instrumentStandards?.length) {
    y += 1;
    autoTable(doc, {
      startY: y,
      margin: { left: ML, right: PAGE_W - MR },
      head: [[
        "Termo-Higrômetro / Barômetro",
        "Certificado número",
        "Data de Calibração",
        "Data de Validade",
      ]],
      body: [[
        joinSlash(model.instrumentStandards.map((st) => st.code)),
        joinSlash(model.instrumentStandards.map((st) => st.certificate)),
        joinSlash(model.instrumentStandards.map((st) => st.calibrationDate)),
        joinSlash(model.instrumentStandards.map((st) => st.validUntil)),
      ]],
      styles: { fontSize: 6, cellPadding: 1.2, halign: "center" },
      headStyles: { ...tableHeadStyles(doc), fontSize: 5.5 },
      theme: "grid",
    });
    y = doc.lastAutoTable.finalY + 2;
  }

  if (model.weightStandards?.length) {
    y = drawSectionBar(doc, ML, y, CW, "PADRÕES DE REFERÊNCIA");
    const pairs = [];
    for (let i = 0; i < model.weightStandards.length; i += 2) {
      const w1 = model.weightStandards[i];
      const w2 = model.weightStandards[i + 1];
      pairs.push([
        s(w1?.code),
        s(w1?.calibrationDate),
        s(w1?.validUntil),
        s(w1?.traceability),
        s(w2?.code),
        s(w2?.calibrationDate),
        s(w2?.validUntil),
        s(w2?.traceability),
      ]);
    }
    autoTable(doc, {
      startY: y,
      margin: { left: ML, right: PAGE_W - MR },
      head: [[
        "Identificação", "Data Calibração", "Validade", "Rastreabilidade",
        "Identificação", "Data Calibração", "Validade", "Rastreabilidade",
      ]],
      body: pairs,
      styles: { fontSize: 5.5, cellPadding: 1, halign: "center" },
      headStyles: { ...tableHeadStyles(doc), fontSize: 5 },
      theme: "grid",
    });
    y = doc.lastAutoTable.finalY + 3;
  }

  return y;
}

function drawPlatformDiagramAt(doc, model, y, x, width, ctx) {
  const platformDiagrams = ctx.platformDiagrams;
  const caption = "Local na plataforma\nonde foi aplicada a carga";

  if (!platformDiagrams?.ok || !platformDiagrams.panels?.length) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.5);
    doc.text(caption, x + width / 2, y + 2, { align: "center" });
    const cx = x + width / 2;
    const cy = y + 12;
    doc.setDrawColor(...FORM_COLORS.border);
    doc.rect(cx - 10, cy - 6, 20, 12, "S");
    [[0, -4], [-6, 3], [6, 3], [-6, -2], [6, -2]].forEach(([dx, dy], i) => {
      doc.circle(cx + dx, cy + dy, 2, "S");
      doc.text(String(i + 1), cx + dx - 1, cy + dy + 1);
    });
    return y + 24;
  }

  const gap = 1;
  const panels = platformDiagrams.panels;
  const colW = (width - gap * (panels.length - 1)) / panels.length;
  const imgH = 18;
  const labelH = 4;
  let maxY = y;

  panels.forEach((panel, i) => {
    const px = x + i * (colW + gap);
    const active = panel.id === platformDiagrams.activePanelId;
    const boxH = imgH + 1;

    if (active) {
      doc.setFillColor(...FORM_COLORS.fieldLabelGreen);
      doc.rect(px, y, colW, boxH + labelH, "F");
    }
    doc.setDrawColor(...(active ? FORM_COLORS.brand : FORM_COLORS.border));
    doc.setLineWidth(active ? 0.3 : 0.1);
    doc.rect(px, y, colW, boxH, "S");

    if (panel.dataUrl) {
      try {
        const pad = 0.5;
        const maxW = colW - pad * 2;
        const aspect = panel.aspectRatio > 0 ? panel.aspectRatio : 1;
        let drawW = maxW;
        let drawH = drawW / aspect;
        if (drawH > imgH) {
          drawH = imgH;
          drawW = drawH * aspect;
        }
        doc.addImage(
          panel.dataUrl,
          pdfImageFormat(panel.dataUrl),
          px + pad + (maxW - drawW) / 2,
          y + pad,
          drawW,
          drawH,
        );
      } catch { /* opcional */ }
    }

    doc.setFont("helvetica", active ? "bold" : "normal");
    doc.setFontSize(4.5);
    doc.setTextColor(...FORM_COLORS.text);
    doc.text(
      panel.displayLabel || panel.label,
      px + colW / 2,
      y + boxH + 2.8,
      { align: "center", maxWidth: colW - 1 },
    );
    maxY = Math.max(maxY, y + boxH + labelH + 2);
  });

  doc.setLineWidth(0.12);
  doc.setFontSize(5);
  doc.text(caption, x + width / 2, maxY, { align: "center" });
  return maxY + 4;
}

function drawEccentricitySection(doc, model, y, ctx) {
  if (model.eccentricity?.showSection === false) return y;
  ({ y } = ensureSpace(doc, y, 52, ctx));
  y = drawSectionBar(doc, ML, y, CW, "ENSAIO DE EXCENTRICIDADE");

  const tableW = 42;
  const gap = 3;
  const diagramX = ML + tableW + gap;
  const diagramW = CW - tableW - gap;

  y = drawDualSubsectionTitles(
    doc,
    ML,
    y,
    "Resultados Obtidos",
    "Tipos de Plataforma",
    tableW,
    diagramW,
    gap,
    model.eccentricity?.eccentricitySubtitle || "",
  );

  autoTable(doc, {
    startY: y,
    margin: { left: ML, right: PAGE_W - ML - tableW },
    head: [["", "Antes do Ajuste", "Após Ajuste"]],
    body: model.eccentricity.points.map((pt) => [
      String(pt.number),
      s(pt.beforeDisplay),
      s(pt.afterDisplay),
    ]),
    styles: { fontSize: 6, cellPadding: 1, halign: "center" },
    headStyles: { ...tableHeadStyles(doc), fontSize: 5.5 },
    theme: "grid",
  });
  const tableEndY = doc.lastAutoTable.finalY;
  const diagramEndY = drawPlatformDiagramAt(doc, model, y, diagramX, diagramW, ctx);

  return Math.max(tableEndY, diagramEndY) + 3;
}

function cellPair(m) {
  return [s(m?.value ?? "--"), s(m?.unit ?? "")];
}

function drawRepeatabilityMetaFooter(doc, model, y, leftW, rightX, rightW, signatureUrls = {}) {
  const lineH = 4.2;
  const metaY = y + 1;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(...FORM_COLORS.text);

  const metaLines = [
    `Número de Leituras: ${s(model.readingsPerPoint)}`,
    `Números de Pontos Calibrados: ${model.calibratedPointsCount ?? "—"}`,
    `Data da calibração: ${s(model.calibrationDate)}`,
    `Data da emissão do Certificado: ${s(model.issueDate || model.approvalDate)}`,
    `Técnico Responsável: ${s(model.executorName)}`,
  ];
  metaLines.forEach((line, i) => {
    doc.text(line, ML, metaY + i * lineH);
  });

  const sigW = Math.min(rightW * 0.75, 55);
  const sigX = rightX + (rightW - sigW) / 2;
  const sigLineY = metaY + 10;

  if (signatureUrls.signatory) {
    try {
      doc.addImage(signatureUrls.signatory, pdfImageFormat(signatureUrls.signatory), sigX, metaY, sigW, 9);
    } catch { /* opcional */ }
  }

  doc.setDrawColor(...FORM_COLORS.border);
  doc.setLineWidth(0.15);
  doc.line(sigX, sigLineY, sigX + sigW, sigLineY);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.text("SIGNATÁRIO", sigX, sigLineY + 3.5);
  doc.setFont("helvetica", "normal");
  doc.text(s(model.signatoryName), sigX + sigW, sigLineY + 3.5, { align: "right" });

  return Math.max(metaY + metaLines.length * lineH, sigLineY + 7) + 2;
}

function drawRepeatabilityCalibrationSection(doc, model, y, ctx) {
  const rows = model.repeatabilityRows || [];
  if (!rows.some((r) => !r.empty) && !model.points?.length) return y;

  const unitLabel = model.unit || model.balance?.unidade || "kg";
  const leftW = CW * 0.42;
  const rightW = CW * 0.56;
  const gap = CW * 0.02;
  const rightX = ML + leftW + gap;

  ({ y } = ensureSpace(doc, y, 72, ctx));
  y = drawSectionBar(doc, ML, y, CW, "ENSAIO DE REPETIBILIDADE");
  y = drawDualSubsectionTitles(
    doc,
    ML,
    y,
    "Resultados Obtidos Antes do Ajuste",
    "Resultados Obtidos",
    leftW,
    rightW,
    gap,
    model.adjustmentSubtitle || "",
  );

  const tableHead = [
    "Valor de Referência",
    unitLabel,
    "Leitura 01",
    unitLabel,
    "Erro de Indicação",
    unitLabel,
  ];

  const leftBody = rows.map((r) => [
    ...cellPair(r.reference),
    ...cellPair(r.beforeReading),
    ...cellPair(r.beforeError),
  ]);

  const rightHead = [
    "Valor de Referência",
    unitLabel,
    "Média das Leituras",
    unitLabel,
    "Erro de Indicação",
    unitLabel,
    "Incerteza Expandida",
    "",
    "Veff",
    "k",
  ];

  const rightBody = rows.map((r) => [
    ...cellPair(r.reference),
    ...cellPair(r.average),
    ...cellPair(r.indicationError),
    s(r.expandedUncertainty?.value ?? "--"),
    s(r.expandedUncertainty?.unit ?? unitLabel),
    s(r.veff),
    s(r.k),
  ]);

  const sharedStyles = {
    fontSize: 5.5,
    cellPadding: 0.8,
    halign: "center",
    valign: "middle",
    lineWidth: 0.1,
  };

  const unitColStyle = { cellWidth: 7, fontSize: 5, halign: "center" };

  autoTable(doc, {
    startY: y,
    margin: { left: ML, right: PAGE_W - ML - leftW },
    head: [tableHead],
    body: leftBody,
    styles: sharedStyles,
    headStyles: { ...tableHeadStyles(doc), fontSize: 5.5, halign: "center" },
    columnStyles: {
      1: unitColStyle,
      3: unitColStyle,
      5: unitColStyle,
    },
    theme: "grid",
  });
  const leftEndY = doc.lastAutoTable.finalY;

  autoTable(doc, {
    startY: y,
    margin: { left: rightX, right: ML },
    head: [rightHead],
    body: rightBody,
    styles: sharedStyles,
    headStyles: { ...tableHeadStyles(doc), fontSize: 5, halign: "center" },
    columnStyles: {
      1: unitColStyle,
      3: unitColStyle,
      5: unitColStyle,
      7: unitColStyle,
      8: { cellWidth: 10 },
      9: { cellWidth: 8 },
    },
    theme: "grid",
  });
  y = Math.max(leftEndY, doc.lastAutoTable.finalY) + 2;

  y = drawRepeatabilityMetaFooter(
    doc,
    model,
    y,
    leftW,
    rightX,
    rightW,
    ctx.signatureUrls || {},
  );
  return y;
}

function drawSubstitutionRepeatabilitySection(doc, model, y, ctx) {
  if (!model.substitutionRepeatability?.applicable || !model.substitutionRepeatability.rows?.length) return y;
  ({ y } = ensureSpace(doc, y, 22, ctx));
  y = drawSectionBar(doc, ML, y, CW, "REPETIBILIDADE COM LOTE DE CARGA");
  autoTable(doc, {
    startY: y,
    margin: { left: ML, right: PAGE_W - MR },
    head: [["Linha", "Valor nominal", "Leitura 1", "Leitura 2", "Leitura 3"]],
    body: model.substitutionRepeatability.rows.map((r) => [
      s(r.label), s(r.nominal), s(r.reading1), s(r.reading2), s(r.reading3),
    ]),
    styles: { fontSize: 6, cellPadding: 1.2 },
    headStyles: tableHeadStyles(doc),
    theme: "grid",
  });
  y = doc.lastAutoTable.finalY + 2;
  if (model.substitutionRepeatability.observations) {
    doc.setFontSize(6.5);
    doc.text(`Observações: ${model.substitutionRepeatability.observations}`, ML, y, { maxWidth: CW });
    y += 5;
  }
  return y + 1;
}

function drawObservationsSection(doc, model, y, ctx) {
  ({ y } = ensureSpace(doc, y, 40, ctx));
  y = drawSectionBar(doc, ML, y, CW, "OBSERVAÇÕES");
  y = drawNumberedObservations(doc, ML + 1, y + 1, model.observations, CW - 2) + 2;
  if (model.conformityDeclaration) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(model.conformityDeclaration, ML, y);
    y += 6;
  }
  return y;
}

function drawApprovalBlock(doc, model, y, ctx, signatureUrls = {}) {
  if (model.repeatabilityRows?.some((r) => !r.empty) || model.points?.length) {
    return y;
  }
  ({ y } = ensureSpace(doc, y, 36, ctx));
  return drawRepeatabilityMetaFooter(doc, model, y, CW * 0.42, ML + CW * 0.44, CW * 0.56, signatureUrls);
}

export function drawCertificatePdf(doc, model, { logoDataUrl, signatureUrls, platformDiagrams } = {}) {
  const ctx = { model, logoDataUrl, compactHeader: true, platformDiagrams, signatureUrls };
  let y = drawCertificateHeader(doc, model, logoDataUrl);

  y = drawClientSection(doc, model, y, ctx);
  y = drawInstrumentSection(doc, model, y, ctx);
  y = drawEnvironmentalSection(doc, model, y, ctx);
  y = drawEccentricitySection(doc, model, y, ctx);
  y = drawRepeatabilityCalibrationSection(doc, model, y, ctx);
  y = drawSubstitutionRepeatabilitySection(doc, model, y, ctx);
  y = drawApprovalBlock(doc, model, y, ctx, signatureUrls);
  drawObservationsSection(doc, model, y, ctx);

  drawCertificateDocumentFooters(doc, model);

  if (model.preview) drawWatermark(doc, "PRÉVIA TÉCNICA");
  if (model.cancelled) drawWatermark(doc, "CANCELADO");
}

export function buildCertificatePdfBlob(cert, tenantName, opts = {}) {
  const model = buildCertificatePdfViewModel(cert, opts);
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  drawCertificatePdf(doc, model, opts);
  const fileName = opts.fileName || `certificado-${cert.certificate_number || cert.id?.slice(0, 8)}.pdf`;
  return { blob: doc.output("blob"), fileName };
}

export async function renderCertificatePdf(cert, tenantName, opts = {}) {
  const { blob, fileName } = buildCertificatePdfBlob(cert, tenantName, opts);
  if (opts.download === false) return { blob, fileName };
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
  return { blob, fileName };
}
