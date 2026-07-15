import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { buildWeightCertificatePdfViewModel } from "./viewModel";
import { pdfImageFormat } from "@/lib/certificatePdf/compressPdfImages";
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
  ensureSpace,
  drawNumberedObservations,
  tableHeadStyles,
  getCertificateLayoutMetrics,
} from "@/lib/certificatePdf/certificatePdfLayout";

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

function resolveTableMargin(ctx, margin) {
  if (!ctx.singlePage) return margin;
  return {
    ...margin,
    bottom: PAGE_H - ctx.metrics.contentBottom,
  };
}

function drawClientSection(doc, model, y, ctx) {
  const m = ctx.metrics;
  ({ y } = ensureSpace(doc, y, 28, ctx));
  y = drawSectionBar(doc, ML, y, CW, "DADOS DO CLIENTE", m);
  y = drawFieldGrid(doc, ML, y, CW, 3, [
    { label: "Cliente / Solicitante", value: model.client.name },
    { label: "C.N.P.J.", value: model.client.cnpj },
    { label: "Responsável", value: model.client.representative },
    { label: "Contratante", value: model.client.contractor || "—" },
    { label: "Endereço", value: model.client.address },
    { label: "Cidade", value: model.client.city },
    { label: "Estado", value: model.client.state },
    { label: "Unidade", value: model.client.unit },
  ], m);
  return y + 1;
}

function drawWeightInfoSection(doc, model, y, ctx) {
  const m = ctx.metrics;
  ({ y } = ensureSpace(doc, y, 36, ctx));
  y = drawSectionBar(doc, ML, y, CW, "IDENTIFICAÇÃO DO(S) PESO(S)", m);

  autoTable(doc, {
    startY: y,
    margin: resolveTableMargin(ctx, { left: ML, right: PAGE_W - MR }),
    head: [[
      "Identificação", "Nº Série", "Classe", "Fabricante",
      "Nº Processo", "Local", "Foi ajuste?",
    ]],
    body: [[
      s(model.weight.identification),
      s(model.weight.serial),
      s(model.weight.class),
      s(model.weight.manufacturer),
      s(model.weight.processNumber),
      s(model.weight.location),
      s(model.weight.wasAdjusted),
    ]],
    styles: { fontSize: m.tableFontSize, cellPadding: m.tableCellPadding, halign: "center", valign: "middle" },
    headStyles: { ...tableHeadStyles(doc), fontSize: m.tableHeadFontSize },
    theme: "grid",
  });
  y = doc.lastAutoTable.finalY + 1.5;

  autoTable(doc, {
    startY: y,
    margin: resolveTableMargin(ctx, { left: ML, right: PAGE_W - MR }),
    head: [["Data Calibração", "Data Emissão", "Data Aprovação", "Validade", "Tipo", "Nº Certificado"]],
    body: [[
      s(model.dates.calibration),
      s(model.dates.issue),
      s(model.dates.approval),
      s(model.dates.validity),
      s(model.document.typeLabel),
      s(model.document.number),
    ]],
    styles: { fontSize: m.tableFontSize, cellPadding: m.tableCellPadding, halign: "center" },
    headStyles: { ...tableHeadStyles(doc), fontSize: m.tableHeadFontSize },
    theme: "grid",
  });
  y = doc.lastAutoTable.finalY + 2;

  if (model.weight.descriptions?.length) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(m.tableFontSize || 7);
    doc.setTextColor(...FORM_COLORS.text);
    const desc = model.weight.descriptions.filter(Boolean).join(" · ");
    const lines = doc.splitTextToSize(`Descrição: ${desc}`, CW - 2);
    doc.text(lines, ML + 1, y);
    y += lines.length * 3.2 + 1;
  }

  return y;
}

function drawEnvironmentalSection(doc, model, y, ctx) {
  const m = ctx.metrics;
  ({ y } = ensureSpace(doc, y, 28, ctx));
  y = drawSectionBar(doc, ML, y, CW, "CONDIÇÕES AMBIENTAIS — DURANTE A CALIBRAÇÃO", m);

  y = drawCompactMeasureRow(doc, ML, y, CW, [
    {
      label: "Temperatura (°C)",
      value: `${model.environmental.tempInitial} / ${model.environmental.tempFinal} (méd. ${model.environmental.tempMean})`,
    },
    {
      label: "Umidade (%UR)",
      value: `${model.environmental.humidityInitial} / ${model.environmental.humidityFinal} (méd. ${model.environmental.humidityMean})`,
    },
    {
      label: "Pressão (hPa)",
      value: `${model.environmental.pressureInitial} / ${model.environmental.pressureFinal} (méd. ${model.environmental.pressureMean})`,
    },
    {
      label: "Densidade do ar (kg/m³)",
      value: model.environmental.airDensity,
    },
  ], m);

  return y + 2;
}

function drawStandardsSection(doc, model, y, ctx) {
  if (!model.standards?.length) return y;
  const m = ctx.metrics;
  ({ y } = ensureSpace(doc, y, 30, ctx));
  y = drawSectionBar(doc, ML, y, CW, "RASTREABILIDADE — PADRÕES UTILIZADOS", m);

  autoTable(doc, {
    startY: y,
    margin: resolveTableMargin(ctx, { left: ML, right: PAGE_W - MR }),
    head: [["Tipo", "Identificação", "Certificado", "Validade", "Laboratório"]],
    body: model.standards.map((st) => [
      s(st.type),
      s(st.identification),
      s(st.certificate),
      s(st.validUntil),
      s(st.laboratory),
    ]),
    styles: { fontSize: m.compactTableFontSize || 6.5, cellPadding: m.compactTablePadding || 1.2, halign: "center" },
    headStyles: { ...tableHeadStyles(doc), fontSize: m.tableHeadFontSize },
    theme: "grid",
  });
  return doc.lastAutoTable.finalY + 2;
}

function drawResultsSection(doc, model, y, ctx) {
  const m = ctx.metrics;
  ({ y } = ensureSpace(doc, y, 40, ctx));
  y = drawSectionBar(doc, ML, y, CW, "RESULTADOS DA CALIBRAÇÃO", m);

  const emptyRow = Array.from({ length: 13 }, () => "—");
  const body = (model.items || []).length
    ? model.items.map((it) => [
      s(it.number),
      s(it.identification),
      s(it.material),
      s(it.nominal),
      s(it.density),
      s(it.conventional),
      s(it.deviation),
      s(it.uncertainty),
      s(it.k),
      s(it.class),
      s(it.before),
      s(it.after),
      s(it.approved),
    ])
    : [emptyRow];

  autoTable(doc, {
    startY: y,
    margin: resolveTableMargin(ctx, { left: ML, right: PAGE_W - MR }),
    head: [[
      "Item", "Identificação", "Material", "Nominal", "Densidade",
      "Valor conv.", "Desvio", "U", "k", "Classe", "Antes", "Após", "Aprovado",
    ]],
    body,
    styles: { fontSize: Math.min(m.compactTableFontSize || 6.2, 5.6), cellPadding: 0.9, halign: "center", valign: "middle" },
    headStyles: { ...tableHeadStyles(doc), fontSize: Math.max((m.tableHeadFontSize || 7) - 1.2, 5.2) },
    theme: "grid",
  });
  return doc.lastAutoTable.finalY + 2;
}

function drawSignaturesSection(doc, model, y, ctx, signatureUrls = {}) {
  const m = ctx.metrics;
  ({ y } = ensureSpace(doc, y, 36, ctx));
  y = drawSectionBar(doc, ML, y, CW, "RESPONSÁVEIS", m);

  const colW = (CW - 8) / 2;
  const leftX = ML;
  const rightX = ML + colW + 8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...FORM_COLORS.text);
  doc.text("Executado por", leftX, y);
  doc.text("Aprovado por (Signatário)", rightX, y);
  y += 4;

  const drawSig = (x, url) => {
    if (!url) return;
    try {
      const fmt = pdfImageFormat(url);
      doc.addImage(url, fmt, x, y, 36, 12);
    } catch {
      /* ignore */
    }
  };

  drawSig(leftX, signatureUrls.executor);
  drawSig(rightX, signatureUrls.signatory);
  y += signatureUrls.executor || signatureUrls.signatory ? 14 : 2;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text(s(model.people.executor) || "—", leftX, y);
  doc.text(s(model.people.signatory) || "—", rightX, y);
  return y + 6;
}

function drawObservationsSection(doc, model, y, ctx) {
  const m = ctx.metrics;
  ({ y } = ensureSpace(doc, y, 28, ctx));
  y = drawSectionBar(doc, ML, y, CW, "OBSERVAÇÕES", m);
  return drawNumberedObservations(doc, ML + 1, y + 0.5, model.observations, CW - 2, m) + 2;
}

function drawWeightCertificatePdfContent(doc, model, opts = {}) {
  const singlePage = opts.singlePage === true;
  const metrics = opts.metrics || getCertificateLayoutMetrics(singlePage);
  const ctx = {
    model,
    logoDataUrl: opts.logoDataUrl,
    signatureUrls: opts.signatureUrls,
    singlePage,
    metrics,
  };

  const headerModel = {
    ...model,
    certificateNumber: model.document.number,
    certificateType: model.document.type || "rastreavel",
    certificateTitle:
      (model.document.type || "rastreavel") === "rbc"
        ? "CERTIFICADO DE CALIBRAÇÃO DE PESOS RBC"
        : "CERTIFICADO DE CALIBRAÇÃO DE PESOS",
    tenantName: model.tenantName,
    lab: opts.tenant ? {
      name: opts.tenant.name,
      address: opts.tenant.address,
      phone: opts.tenant.phone,
      website: opts.tenant.website,
      cgcreCalNumber: opts.tenant.cgcre_cal_number,
      ipemNumber: opts.tenant.ipem_number,
    } : undefined,
    documentMeta: opts.documentMeta || {
      code: model.document.code,
      revision: model.document.revision,
      reference: model.document.reference,
      modelIssueDate: model.document.issueDate,
    },
  };

  let y = drawCertificateHeader(doc, headerModel, opts.logoDataUrl, metrics.headerStartY, metrics);

  // keep context.model aligned for page breaks / footers
  ctx.model = headerModel;

  y = drawClientSection(doc, model, y, ctx);
  y = drawWeightInfoSection(doc, model, y, ctx);
  y = drawEnvironmentalSection(doc, model, y, ctx);
  y = drawStandardsSection(doc, model, y, ctx);
  y = drawResultsSection(doc, model, y, ctx);
  y = drawSignaturesSection(doc, model, y, ctx, opts.signatureUrls || {});
  drawObservationsSection(doc, model, y, ctx);

  drawCertificateDocumentFooters(doc, headerModel);

  if (model.preview) drawWatermark(doc, "PRÉVIA TÉCNICA");
  if (model.cancelled) drawWatermark(doc, "CANCELADO");
}

export function drawWeightCertificatePdf(doc, model, opts = {}) {
  drawWeightCertificatePdfContent(doc, model, opts);
}

export function buildWeightCertificatePdfBlob(cert, tenantName, opts = {}) {
  const model = buildWeightCertificatePdfViewModel(cert, {
    ...opts,
    tenantName: tenantName || opts.tenantName || opts.tenant?.name || "",
    preview: opts.preview,
    cancelled: opts.cancelled,
    documentMeta: opts.documentMeta,
  });
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
  drawWeightCertificatePdf(doc, model, opts);
  const fileName = opts.fileName || `certificado-peso-${cert.certificate_number || cert.id?.slice(0, 8)}.pdf`;
  return { blob: doc.output("blob"), fileName };
}

export async function renderWeightCertificatePdf(cert, tenantName, opts = {}) {
  const { blob, fileName } = buildWeightCertificatePdfBlob(cert, tenantName, opts);
  if (opts.download === false) return { blob, fileName };
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
  return { blob, fileName };
}
