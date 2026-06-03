import { jsPDF } from "jspdf";
import { buildMonitoringPdfViewModel } from "./viewModels";
import { drawPersonnelPdfHeader, drawPersonnelPageFooters } from "./drawPersonnelPdfHeader";
import {
  drawLabelValueTable,
  drawSectionTitle,
  drawSectionBlock,
  drawAuthBlock,
  drawSignatureRow,
} from "./competencySections";
function redrawHeader(doc, header, logoDataUrl, yStart) {
  return drawPersonnelPdfHeader(doc, header, logoDataUrl, yStart);
}

export async function drawMonitoringPdf(record, { logoDataUrl, signatureUrls = {} } = {}) {
  const model = buildMonitoringPdfViewModel(record);

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = redrawHeader(doc, model.header, logoDataUrl);
  if (model.subjectMetaRows?.length) y = drawLabelValueTable(doc, y, model.subjectMetaRows);
  y = drawLabelValueTable(doc, y, model.metaRows);

  y = drawSectionTitle(doc, y, "1. Supervisão e Monitoramento");
  y = drawLabelValueTable(doc, y, model.supervisionRows);

  y = drawSectionTitle(doc, y, "1.1 Competências Monitoradas");
  y = drawLabelValueTable(doc, y, model.competencyRows);

  y = drawSectionTitle(doc, y, "2. Treinamento");
  y = drawLabelValueTable(doc, y, model.trainingRows);

  y = drawSectionTitle(doc, y, "3. Próximo Monitoramento");
  y = drawLabelValueTable(doc, y, model.nextRows);

  y = drawAuthBlock(doc, y, model.authText, redrawHeader, model.header, logoDataUrl);
  y = drawSectionBlock(
    doc,
    y,
    "Funcionário se mantém adequado à função",
    model.suitability,
    redrawHeader,
    model.header,
    logoDataUrl,
  );
  y = drawSectionBlock(
    doc,
    y,
    "Responsável pela Análise e Aprovação",
    model.approvalName,
    redrawHeader,
    model.header,
    logoDataUrl,
  );
  y = drawSignatureRow(
    doc,
    y,
    "Responsável pela Análise e Aprovação",
    "Ocupante do Cargo",
    signatureUrls.approval || null,
    signatureUrls.occupant || model.occupantSignatureUrl,
    redrawHeader,
    model.header,
    logoDataUrl,
  );

  drawPersonnelPageFooters(doc, model.header);
  const slug = (record.registration_number || "monitoramento").replace(/[^a-zA-Z0-9_-]/g, "_");
  doc.save(`RE-6.2E-${slug}.pdf`);
}
