import { jsPDF } from "jspdf";
import { buildAdequacyPdfViewModel } from "./viewModels";
import { drawPersonnelPdfHeader, drawPersonnelPageFooters } from "./drawPersonnelPdfHeader";
import {
  drawLabelValueTable,
  drawSectionBlock,
  drawListSection,
  drawAuthBlock,
  drawSignatureRow,
} from "./competencySections";
import { adequacyExportFilename } from "@/lib/personnelExportFilename";

function redrawHeader(doc, header, logoDataUrl, yStart) {
  return drawPersonnelPdfHeader(doc, header, logoDataUrl, yStart);
}

export async function drawAdequacyPdf(record, { logoDataUrl, signatureUrls = {} } = {}) {
  const model = buildAdequacyPdfViewModel(record);
  model.approvalSignatureUrl = signatureUrls.approval || null;
  model.occupantSignatureUrl = signatureUrls.occupant || model.occupantSignatureUrl;

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = redrawHeader(doc, model.header, logoDataUrl);
  if (model.subjectMetaRows?.length) y = drawLabelValueTable(doc, y, model.subjectMetaRows);
  y = drawLabelValueTable(doc, y, model.metaRows);

  for (const sec of model.sections) {
    if (sec.type === "list") {
      y = drawListSection(doc, y, sec.title, sec.items, redrawHeader, model.header, logoDataUrl);
    } else {
      y = drawSectionBlock(doc, y, sec.title, sec.content, redrawHeader, model.header, logoDataUrl);
    }
  }

  y = drawAuthBlock(doc, y, model.authText, redrawHeader, model.header, logoDataUrl);
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
    model.approvalSignatureUrl,
    model.occupantSignatureUrl,
    redrawHeader,
    model.header,
    logoDataUrl,
  );

  drawPersonnelPageFooters(doc);
  doc.save(adequacyExportFilename(record, "pdf"));
}
