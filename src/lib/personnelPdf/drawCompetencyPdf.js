import { jsPDF } from "jspdf";
import { buildCompetencyPdfViewModel } from "./viewModels";
import { drawPersonnelPdfHeader, drawPersonnelPageFooters } from "./drawPersonnelPdfHeader";
import {
  drawLabelValueTable,
  drawSectionBlock,
  drawListSection,
  drawAuthBlock,
} from "./competencySections";

function redrawHeader(doc, header, logoDataUrl, yStart) {
  return drawPersonnelPdfHeader(doc, header, logoDataUrl, yStart);
}

export function drawCompetencyPdf(position, { logoDataUrl } = {}) {
  const model = buildCompetencyPdfViewModel(position);
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = redrawHeader(doc, model.header, logoDataUrl);

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

  drawPersonnelPageFooters(doc, model.header);
  const slug = (position.title || "cargo").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 40);
  doc.save(`RE-6.2C-${slug}.pdf`);
}
