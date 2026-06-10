import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { buildAttendanceListPdfViewModel } from "./viewModels";
import { drawPersonnelPdfHeader, drawPersonnelPageFooters, PERSONNEL_PDF_MARGINS, ensurePersonnelSpace } from "./drawPersonnelPdfHeader";
import { drawLabelValueTable, drawSectionTitle, drawSectionBlock } from "./competencySections";
import { attendanceExportFilename } from "@/lib/personnelExportFilename";
import { displayValue } from "@/lib/quotationRequestDisplay";

const { ML, MR } = PERSONNEL_PDF_MARGINS;

function redrawHeader(doc, header, logoDataUrl, yStart) {
  return drawPersonnelPdfHeader(doc, header, logoDataUrl, yStart);
}

function drawParticipantsTable(doc, y, head, body, courseTitle, redrawHeader, header, logoDataUrl) {
  let cy = ensurePersonnelSpace(doc, y, 30, redrawHeader, header, logoDataUrl);
  if (cy > y + 5) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(displayValue(courseTitle), ML, cy - 2);
  }
  autoTable(doc, {
    startY: cy,
    margin: { left: ML, right: 210 - MR },
    head: [head],
    body,
    theme: "grid",
    styles: { fontSize: 7, cellPadding: 2 },
    headStyles: { fillColor: [217, 217, 217], fontStyle: "bold" },
  });
  return doc.lastAutoTable.finalY + 4;
}

export async function drawAttendanceListPdf(record, { logoDataUrl } = {}) {
  const model = buildAttendanceListPdfViewModel(record);
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = redrawHeader(doc, model.header, logoDataUrl);
  if (model.subjectMetaRows?.length) y = drawLabelValueTable(doc, y, model.subjectMetaRows);
  y = drawLabelValueTable(doc, y, model.courseRows);

  const head = ["Nº", "Nome completo", "Departamento", "Visto", "Frequência", "Resultado"];
  y = drawParticipantsTable(doc, y, head, model.participants, model.courseTitle, redrawHeader, model.header, logoDataUrl);

  y = drawSectionTitle(doc, y, "Resumo de Conteúdo do Curso ou Palestra");
  y = drawSectionBlock(doc, y, "", model.contentSummary, redrawHeader, model.header, logoDataUrl);

  if (model.observations) {
    y = drawSectionTitle(doc, y, "Observações");
    y = drawSectionBlock(doc, y, "", model.observations, redrawHeader, model.header, logoDataUrl);
  }

  y = drawSectionTitle(doc, y, "Movimento Geral");
  y = drawLabelValueTable(doc, y, model.movementRows);

  drawPersonnelPageFooters(doc);
  doc.save(attendanceExportFilename(record, "pdf"));
}
