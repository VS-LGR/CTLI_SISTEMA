import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { buildCertificatePdfViewModel, repeatabilityRowsForPdfLayout } from "./viewModel";
import { pdfImageFormat } from "./compressPdfImages";
import {
  ML,
  MR,
  PAGE_W,
  PAGE_H,
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
  getCertificateLayoutMetrics,
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

function resolveTableMargin(ctx, margin) {
  if (!ctx.singlePage) return margin;
  return {
    ...margin,
    bottom: PAGE_H - ctx.metrics.contentBottom,
  };
}

function singlePageTableBreakOpts(ctx) {
  return ctx.singlePage ? { rowPageBreak: "avoid", pageBreak: "avoid" } : {};
}

function drawClientSection(doc, model, y, ctx) {
  const m = ctx.metrics;
  ({ y } = ensureSpace(doc, y, m.singlePage ? 20 : 28, ctx));
  y = drawSectionBar(doc, ML, y, CW, "DADOS DO CLIENTE", m);
  y = drawFieldGrid(doc, ML, y, CW, m.clientGridCols || 3, [
    { label: "Cliente", value: model.client.name },
    { label: "C.N.P.J.", value: model.client.cnpj },
    { label: "Responsável", value: model.client.representative },
    { label: "Endereço", value: model.client.address },
    { label: "Cidade", value: model.client.city },
    { label: "Estado", value: model.client.state },
    { label: "Unidade", value: model.client.unit },
  ], m);
  return y + (m.singlePage ? 0.3 : 1);
}

function drawInstrumentSection(doc, model, y, ctx) {
  const m = ctx.metrics;
  ({ y } = ensureSpace(doc, y, m.singlePage ? 28 : 36, ctx));
  y = drawSectionBar(doc, ML, y, CW, "INFORMAÇÕES TÉCNICAS", m);

  autoTable(doc, {
    startY: y,
    margin: resolveTableMargin(ctx, { left: ML, right: PAGE_W - MR }),
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
    styles: { fontSize: m.tableFontSize, cellPadding: m.tableCellPadding, halign: "center", valign: "middle" },
    headStyles: { ...tableHeadStyles(doc), fontSize: m.tableHeadFontSize },
    theme: "grid",
    ...singlePageTableBreakOpts(ctx),
  });
  y = doc.lastAutoTable.finalY + (m.singlePage ? 0.5 : 1);

  autoTable(doc, {
    startY: y,
    margin: resolveTableMargin(ctx, { left: ML, right: PAGE_W - MR }),
    head: [["Local da Calibração", "Etiqueta IPEM", "Identificação", "Tipo de Plataforma"]],
    body: [[
      s(model.balance.local),
      s(model.balance.etiqueta),
      s(model.balance.identificacao || model.balance.tag),
      s(model.balance.plataforma),
    ]],
    styles: { fontSize: m.tableFontSize, cellPadding: m.tableCellPadding, halign: "center" },
    headStyles: { ...tableHeadStyles(doc), fontSize: m.tableHeadFontSize },
    theme: "grid",
    ...singlePageTableBreakOpts(ctx),
  });
  y = doc.lastAutoTable.finalY + (m.singlePage ? 1 : 2);

  if (model.balance.capacidade2 || model.balance.resolucao2) {
    autoTable(doc, {
      startY: y,
      margin: resolveTableMargin(ctx, { left: ML, right: PAGE_W - MR }),
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
      styles: { fontSize: m.compactTableFontSize, cellPadding: m.compactTablePadding, halign: "center" },
      headStyles: tableHeadStyles(doc),
      theme: "grid",
      ...singlePageTableBreakOpts(ctx),
    });
    y = doc.lastAutoTable.finalY + (m.singlePage ? 1 : 2);
  }

  return y;
}

function drawEnvironmentalSection(doc, model, y, ctx) {
  const m = ctx.metrics;
  ({ y } = ensureSpace(doc, y, m.singlePage ? 24 : 32, ctx));
  y = drawSectionBar(doc, ML, y, CW, "CONDIÇÕES AMBIENTAIS - DURANTE A CALIBRAÇÃO", m);

  y = drawCompactMeasureRow(doc, ML, y, CW, [
    { label: "Temperatura", value: model.environmental.temperature },
    { label: "Umidade Relativa", value: model.environmental.humidity },
    { label: "Pressão Atmosférica", value: model.environmental.pressure },
    { label: "Massa específica do ar", value: model.environmental.airDensity },
  ], m);

  if (model.instrumentStandards?.length) {
    y += m.singlePage ? 0.5 : 1;
    autoTable(doc, {
      startY: y,
      margin: resolveTableMargin(ctx, { left: ML, right: PAGE_W - MR }),
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
      styles: { fontSize: m.tableFontSize, cellPadding: m.tableCellPadding, halign: "center" },
      headStyles: { ...tableHeadStyles(doc), fontSize: m.tableHeadFontSize },
      theme: "grid",
      ...singlePageTableBreakOpts(ctx),
    });
    y = doc.lastAutoTable.finalY + (m.singlePage ? 1 : 2);
  }

  if (model.weightStandards?.length) {
    y = drawSectionBar(doc, ML, y, CW, "PADRÕES DE REFERÊNCIA", m);
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
      margin: resolveTableMargin(ctx, { left: ML, right: PAGE_W - MR }),
      head: [[
        "Identificação", "Data Calibração", "Validade", "Rastreabilidade",
        "Identificação", "Data Calibração", "Validade", "Rastreabilidade",
      ]],
      body: pairs,
      styles: { fontSize: m.compactTableFontSize, cellPadding: m.compactTablePadding, halign: "center" },
      headStyles: { ...tableHeadStyles(doc), fontSize: m.compactTableHeadFontSize },
      theme: "grid",
      ...singlePageTableBreakOpts(ctx),
    });
    y = doc.lastAutoTable.finalY + (m.singlePage ? 1.5 : 3);
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
  const imgH = ctx.metrics?.platformImgH ?? 26;
  const labelH = ctx.metrics?.platformLabelH ?? 4.5;
  let maxY = y;

  panels.forEach((panel, i) => {
    const px = x + i * (colW + gap);
    const active = panel.id === platformDiagrams.activePanelId;
    const boxH = imgH + 1;

    if (active) {
      doc.setFillColor(...FORM_COLORS.fieldLabel);
      doc.rect(px, y, colW, boxH + labelH, "F");
    }
    doc.setDrawColor(...(active ? FORM_COLORS.accent : FORM_COLORS.border));
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

function drawSubsectionTitle(doc, x, y, text, m) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(m.singlePage ? 6 : 6.5);
  doc.setTextColor(...FORM_COLORS.text);
  doc.text(text, x, y);
  return y + (m.singlePage ? 3 : 4);
}

function drawEccentricityAppliedValue(doc, x, y, eccentricity, m) {
  if (!eccentricity?.appliedValueDisplay) return y;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(m.singlePage ? 5.5 : 6.5);
  doc.setTextColor(...FORM_COLORS.text);
  doc.text(`Valor aplicado: ${eccentricity.appliedValueDisplay}`, x, y);
  return y + (m.singlePage ? 3 : 4);
}

function drawEccentricitySection(doc, model, y, ctx) {
  if (model.eccentricity?.showSection === false) return y;
  const m = ctx.metrics;
  const ecc = model.eccentricity;
  const showBeforeAfter = ecc?.showBeforeAfterColumns === true;

  ({ y } = ensureSpace(doc, y, m.singlePage ? 44 : 58, ctx));
  y = drawSectionBar(doc, ML, y, CW, "ENSAIO DE EXCENTRICIDADE", m);

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
    ecc?.eccentricitySubtitle || "",
  );

  y = drawEccentricityAppliedValue(doc, ML, y, ecc, m);

  autoTable(doc, {
    startY: y,
    margin: resolveTableMargin(ctx, { left: ML, right: PAGE_W - ML - tableW }),
    head: [showBeforeAfter
      ? ["", "Antes do Ajuste", "Após Ajuste"]
      : ["", "Resultados Obtidos"]],
    body: ecc.points.map((pt) => (
      showBeforeAfter
        ? [String(pt.number), s(pt.beforeDisplay), s(pt.afterDisplay)]
        : [String(pt.number), s(pt.resultDisplay)]
    )),
    styles: { fontSize: m.tableFontSize, cellPadding: m.compactTablePadding, halign: "center" },
    headStyles: { ...tableHeadStyles(doc), fontSize: m.tableHeadFontSize },
    theme: "grid",
    ...singlePageTableBreakOpts(ctx),
  });
  const tableEndY = doc.lastAutoTable.finalY;
  const diagramEndY = drawPlatformDiagramAt(doc, model, y, diagramX, diagramW, ctx);

  return Math.max(tableEndY, diagramEndY) + (m.singlePage ? 1.5 : 3);
}

function cellPair(m) {
  return [s(m?.value ?? "--"), s(m?.unit ?? "")];
}

function drawRepeatabilityMetaFooter(doc, model, y, leftW, rightX, rightW, signatureUrls = {}, metrics = null) {
  const m = metrics || getCertificateLayoutMetrics(false);
  const lineH = m.metaLineH;
  const metaY = y + 0.5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(m.metaFontSize);
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

  const sigW = Math.min(rightW * 0.75, m.singlePage ? 48 : 55);
  const sigX = rightX + (rightW - sigW) / 2;
  const sigLineY = metaY + (m.singlePage ? 8 : 10);

  if (signatureUrls.signatory) {
    try {
      doc.addImage(
        signatureUrls.signatory,
        pdfImageFormat(signatureUrls.signatory),
        sigX,
        metaY,
        sigW,
        m.signatureH,
      );
    } catch { /* opcional */ }
  }

  doc.setDrawColor(...FORM_COLORS.border);
  doc.setLineWidth(0.15);
  doc.line(sigX, sigLineY, sigX + sigW, sigLineY);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(m.metaFontSize);
  doc.text("SIGNATÁRIO", sigX, sigLineY + 3);
  doc.setFont("helvetica", "normal");
  doc.text(s(model.signatoryName), sigX + sigW, sigLineY + 3, { align: "right" });

  return Math.max(metaY + metaLines.length * lineH, sigLineY + (m.singlePage ? 5 : 7)) + 1;
}

function drawRepeatabilityCalibrationSection(doc, model, y, ctx) {
  const allRows = model.repeatabilityRows || [];
  if (!allRows.some((r) => !r.empty) && !model.points?.length) return y;

  const m = ctx.metrics;
  const rows = repeatabilityRowsForPdfLayout(allRows, m);
  const unitLabel = model.unit || model.balance?.unidade || "kg";
  const showBeforeAdjustment = model.adjustmentPerformed === true;
  const leftW = showBeforeAdjustment ? CW * 0.42 : 0;
  const rightW = showBeforeAdjustment ? CW * 0.56 : CW;
  const gap = showBeforeAdjustment ? CW * 0.02 : 0;
  const rightX = showBeforeAdjustment ? ML + leftW + gap : ML;

  ({ y } = ensureSpace(doc, y, m.singlePage ? 58 : 72, ctx));
  y = drawSectionBar(doc, ML, y, CW, "ENSAIO DE REPETIBILIDADE", m);

  if (showBeforeAdjustment) {
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
  } else {
    y = drawSubsectionTitle(doc, ML, y, "Resultados Obtidos", m);
    if (model.adjustmentSubtitle) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(m.singlePage ? 5.5 : 6);
      doc.text(model.adjustmentSubtitle, ML, y, { maxWidth: CW });
      y += m.singlePage ? 4 : 5;
    }
  }

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
    fontSize: m.compactTableFontSize,
    cellPadding: m.compactTablePadding,
    halign: "center",
    valign: "middle",
    lineWidth: 0.1,
  };

  const unitColStyle = { cellWidth: m.singlePage ? 6 : 7, fontSize: m.singlePage ? 4.5 : 5, halign: "center" };

  let leftEndY = y;

  if (showBeforeAdjustment) {
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

    autoTable(doc, {
      startY: y,
      margin: resolveTableMargin(ctx, { left: ML, right: PAGE_W - ML - leftW }),
      head: [tableHead],
      body: leftBody,
      styles: sharedStyles,
      headStyles: { ...tableHeadStyles(doc), fontSize: m.compactTableHeadFontSize, halign: "center" },
      columnStyles: {
        1: unitColStyle,
        3: unitColStyle,
        5: unitColStyle,
      },
      theme: "grid",
      ...singlePageTableBreakOpts(ctx),
    });
    leftEndY = doc.lastAutoTable.finalY;
  }

  autoTable(doc, {
    startY: y,
    margin: resolveTableMargin(ctx, {
      left: rightX,
      right: showBeforeAdjustment ? ML : PAGE_W - MR,
    }),
    head: [rightHead],
    body: rightBody,
    styles: sharedStyles,
    headStyles: { ...tableHeadStyles(doc), fontSize: m.compactTableHeadFontSize, halign: "center" },
    columnStyles: {
      1: unitColStyle,
      3: unitColStyle,
      5: unitColStyle,
      7: unitColStyle,
      8: { cellWidth: m.singlePage ? 9 : 10 },
      9: { cellWidth: m.singlePage ? 7 : 8 },
    },
    theme: "grid",
    ...singlePageTableBreakOpts(ctx),
  });
  y = Math.max(leftEndY, doc.lastAutoTable.finalY) + (m.singlePage ? 1 : 2);

  y = drawRepeatabilityMetaFooter(
    doc,
    model,
    y,
    showBeforeAdjustment ? leftW : CW * 0.42,
    showBeforeAdjustment ? rightX : ML + CW * 0.44,
    showBeforeAdjustment ? rightW : CW * 0.56,
    ctx.signatureUrls || {},
    m,
  );
  return y;
}

function drawSubstitutionRepeatabilitySection(doc, model, y, ctx) {
  if (!model.substitutionRepeatability?.applicable || !model.substitutionRepeatability.rows?.length) return y;
  const m = ctx.metrics;
  ({ y } = ensureSpace(doc, y, m.singlePage ? 16 : 22, ctx));
  y = drawSectionBar(doc, ML, y, CW, "REPETIBILIDADE COM LOTE DE CARGA", m);
  autoTable(doc, {
    startY: y,
    margin: resolveTableMargin(ctx, { left: ML, right: PAGE_W - MR }),
    head: [["Linha", "Valor nominal", "Leitura 1", "Leitura 2", "Leitura 3"]],
    body: model.substitutionRepeatability.rows.map((r) => [
      s(r.label), s(r.nominal), s(r.reading1), s(r.reading2), s(r.reading3),
    ]),
    styles: { fontSize: m.tableFontSize, cellPadding: m.tableCellPadding },
    headStyles: tableHeadStyles(doc),
    theme: "grid",
    ...singlePageTableBreakOpts(ctx),
  });
  y = doc.lastAutoTable.finalY + (m.singlePage ? 1 : 2);
  if (model.substitutionRepeatability.observations) {
    doc.setFontSize(m.metaFontSize);
    doc.text(`Observações: ${model.substitutionRepeatability.observations}`, ML, y, { maxWidth: CW });
    y += m.singlePage ? 3.5 : 5;
  }
  return y + (m.singlePage ? 0.3 : 1);
}

function drawObservationsSection(doc, model, y, ctx) {
  const m = ctx.metrics;
  const available = m.contentBottom - y;
  let obsMetrics = m;
  if (m.singlePage && available < 36) {
    obsMetrics = {
      ...m,
      observationFontSize: 4.35,
      observationLineH: 2.1,
      observationGap: 0.35,
    };
  }
  y = drawSectionBar(doc, ML, y, CW, "OBSERVAÇÕES", m);
  y = drawNumberedObservations(doc, ML + 1, y + 0.5, model.observations, CW - 2, obsMetrics) + (m.singlePage ? 0.5 : 2);
  if (model.conformityDeclaration) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(m.singlePage ? 7 : 8);
    doc.text(model.conformityDeclaration, ML, y);
    y += m.singlePage ? 4 : 6;
  }
  return y;
}

function drawApprovalBlock(doc, model, y, ctx, signatureUrls = {}) {
  if (model.repeatabilityRows?.some((r) => !r.empty) || model.points?.length) {
    return y;
  }
  const m = ctx.metrics;
  ({ y } = ensureSpace(doc, y, m.singlePage ? 28 : 36, ctx));
  return drawRepeatabilityMetaFooter(doc, model, y, CW * 0.42, ML + CW * 0.44, CW * 0.56, signatureUrls, m);
}

function drawCertificatePdfContent(doc, model, opts = {}) {
  const singlePage = opts.singlePage !== false;
  const metrics = opts.metrics || getCertificateLayoutMetrics(singlePage);
  const ctx = {
    model,
    logoDataUrl: opts.logoDataUrl,
    compactHeader: true,
    platformDiagrams: opts.platformDiagrams,
    signatureUrls: opts.signatureUrls,
    singlePage,
    metrics,
  };
  let y = drawCertificateHeader(doc, model, opts.logoDataUrl, metrics.headerStartY, metrics);

  y = drawClientSection(doc, model, y, ctx);
  y = drawInstrumentSection(doc, model, y, ctx);
  y = drawEnvironmentalSection(doc, model, y, ctx);
  y = drawEccentricitySection(doc, model, y, ctx);
  y = drawRepeatabilityCalibrationSection(doc, model, y, ctx);
  y = drawSubstitutionRepeatabilitySection(doc, model, y, ctx);
  y = drawApprovalBlock(doc, model, y, ctx, opts.signatureUrls);
  drawObservationsSection(doc, model, y, ctx);

  drawCertificateDocumentFooters(doc, model);

  if (model.preview) drawWatermark(doc, "PRÉVIA TÉCNICA");
  if (model.cancelled) drawWatermark(doc, "CANCELADO");
}

export function drawCertificatePdf(doc, model, opts = {}) {
  const singlePage = opts.singlePage !== false;
  const originalAddPage = doc.addPage.bind(doc);
  doc.addPage = () => doc;
  try {
    drawCertificatePdfContent(doc, model, { ...opts, singlePage });
    while (doc.internal.getNumberOfPages() > 1) {
      doc.deletePage(doc.internal.getNumberOfPages());
    }
  } finally {
    doc.addPage = originalAddPage;
  }
}

export function buildCertificatePdfBlob(cert, tenantName, opts = {}) {
  const model = buildCertificatePdfViewModel(cert, opts);
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
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
