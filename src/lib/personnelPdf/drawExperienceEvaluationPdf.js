import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { buildExperienceEvaluationPdfViewModel, mergeDocumentMetaHeader } from "./viewModels";
import { drawPersonnelPdfHeader, drawPersonnelPageFooters, PERSONNEL_PDF_MARGINS, ensurePersonnelSpace } from "./drawPersonnelPdfHeader";
import { drawLabelValueTable, drawSectionTitle, drawSectionBlock } from "./competencySections";
import { experienceExportFilename } from "@/lib/personnelExportFilename";
import { EXPERIENCE_EVALUATION_SCORES } from "@/lib/personnelExperienceConstants";

const { ML, MR } = PERSONNEL_PDF_MARGINS;

function redrawHeader(doc, header, logoDataUrl, yStart) {
  return drawPersonnelPdfHeader(doc, header, logoDataUrl, yStart);
}

function drawScoringTable(doc, y, items, redrawHeader, header, logoDataUrl) {
  const scores = EXPERIENCE_EVALUATION_SCORES;
  const head = [["Item de avaliação", ...scores.map(String)]];
  const body = (items || []).map((it) => {
    const row = [`${it.item_number}. ${it.description}`];
    for (const s of scores) row.push(it.score === s ? "X" : "");
    return row;
  });
  let cy = ensurePersonnelSpace(doc, y, 40, redrawHeader, header, logoDataUrl);
  autoTable(doc, {
    startY: cy,
    margin: { left: ML, right: 210 - MR },
    head,
    body,
    theme: "grid",
    styles: { fontSize: 7, cellPadding: 1.5, halign: "center" },
    headStyles: { fillColor: [217, 217, 217], fontStyle: "bold", halign: "center" },
    columnStyles: { 0: { halign: "left", cellWidth: 95 } },
  });
  return doc.lastAutoTable.finalY + 4;
}

export async function drawExperienceEvaluationPdf(record, { logoDataUrl, documentMeta, fileName } = {}) {
  const model = buildExperienceEvaluationPdfViewModel(record);
  model.header = mergeDocumentMetaHeader(model.header, documentMeta);
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = redrawHeader(doc, model.header, logoDataUrl);
  if (model.subjectMetaRows?.length) y = drawLabelValueTable(doc, y, model.subjectMetaRows);
  y = drawLabelValueTable(doc, y, model.identityRows);

  y = drawSectionBlock(
    doc,
    y,
    "",
    "Fazer avaliação do funcionário de acordo com os itens abaixo.",
    redrawHeader,
    model.header,
    logoDataUrl,
  );

  y = drawScoringTable(doc, y, model.evaluationItems, redrawHeader, model.header, logoDataUrl);

  y = drawSectionTitle(doc, y, "Critérios para Pontuação");
  const critBody = model.scoreCriteria.map((c) => [`${c.score} — ${c.label}`]);
  autoTable(doc, {
    startY: y,
    margin: { left: ML, right: 210 - MR },
    body: critBody,
    theme: "grid",
    styles: { fontSize: 8, cellPadding: 2 },
  });
  y = doc.lastAutoTable.finalY + 4;

  y = drawSectionTitle(doc, y, "Resultado da avaliação");
  y = ensurePersonnelSpace(doc, y, 28, redrawHeader, model.header, logoDataUrl);
  const resultRows = [
    ["Data final do período de experiência", model.periodEndDate],
    ["Média final", model.averageScore],
    ["Critério de aprovação", model.approvalCriterion],
    ["Resultado", model.resultLabel],
  ];
  autoTable(doc, {
    startY: y,
    margin: { left: ML, right: 210 - MR },
    body: resultRows,
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 2.5 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 55 } },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 1 && data.row.index === 3) {
        data.cell.styles.fontStyle = "bold";
        if (model.resultLabel === "APROVADO") data.cell.styles.textColor = [22, 101, 52];
        if (model.resultLabel === "REPROVADO") data.cell.styles.textColor = [185, 28, 28];
      }
    },
  });
  y = doc.lastAutoTable.finalY + 4;

  y = drawSectionTitle(doc, y, "Parecer conclusivo");
  y = drawSectionBlock(doc, y, "", model.conclusiveOpinionLabel, redrawHeader, model.header, logoDataUrl);

  y = drawSectionTitle(doc, y, "Avaliado por");
  y = drawSectionBlock(doc, y, "", model.evaluatorName, redrawHeader, model.header, logoDataUrl);

  doc.setDrawColor(120, 120, 120);
  doc.line(ML, y + 8, ML + 80, y + 8);
  doc.setFontSize(8);
  doc.text("Assinatura", ML, y + 12);
  doc.text(`Data: ${model.signatureDate}`, ML, y + 18);

  drawPersonnelPageFooters(doc);
  doc.save(fileName || experienceExportFilename(record, "pdf"));
}
