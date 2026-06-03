import { jsPDF } from "jspdf";
import { buildSelectionPdfViewModel } from "./viewModels";
import { drawPersonnelPdfHeader, drawPersonnelPageFooters } from "./drawPersonnelPdfHeader";
import {
  drawLabelValueTable,
  drawSectionTitle,
  drawSectionBlock,
  drawListSection,
  drawCheckboxList,
  drawSignatureRow,
} from "./competencySections";
import { personnelPdfSlug } from "./personnelSubjectMeta";

function redrawHeader(doc, header, logoDataUrl, yStart) {
  return drawPersonnelPdfHeader(doc, header, logoDataUrl, yStart);
}

export async function drawPersonnelSelectionPdf(record, { logoDataUrl, signatureUrl = null } = {}) {
  const model = buildSelectionPdfViewModel(record);
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = redrawHeader(doc, model.header, logoDataUrl);
  if (model.subjectMetaRows?.length) y = drawLabelValueTable(doc, y, model.subjectMetaRows);
  y = drawLabelValueTable(doc, y, model.page1Rows);

  y = drawCheckboxList(doc, y, "Nível de Formação", model.educationChecklist, redrawHeader, model.header, logoDataUrl);

  y = drawSectionTitle(doc, y, "Atribuições do Cargo conforme RE-6.2C");
  const attr = model.attributions;
  if (attr.showActivities) {
    y = drawSectionBlock(doc, y, "1.1 Conjunto de Atividades Relacionadas à Função", attr.functionActivities, redrawHeader, model.header, logoDataUrl);
  }
  if (attr.showTechnical) {
    y = drawListSection(doc, y, "1.2 Autoridades e Responsabilidades Técnicas", attr.technicalAuthorities, redrawHeader, model.header, logoDataUrl);
  }
  if (attr.showManagerial) {
    y = drawListSection(doc, y, "1.3 Autoridades e Responsabilidades Gerenciais", attr.managerialAuthorities, redrawHeader, model.header, logoDataUrl);
  }

  y = drawListSection(doc, y, "Conhecimentos Gerais", model.generalKnowledge, redrawHeader, model.header, logoDataUrl);
  y = drawListSection(doc, y, "Conhecimento Técnico", model.technicalKnowledge, redrawHeader, model.header, logoDataUrl);
  y = drawListSection(doc, y, "Habilidade", model.skills, redrawHeader, model.header, logoDataUrl);

  doc.addPage();
  y = redrawHeader(doc, model.header, logoDataUrl, 8);
  if (model.subjectMetaRows?.length) y = drawLabelValueTable(doc, y, model.subjectMetaRows);

  y = drawListSection(doc, y, "Qualificação", model.qualifications, redrawHeader, model.header, logoDataUrl);
  y = drawListSection(doc, y, "Experiência", model.experience, redrawHeader, model.header, logoDataUrl);

  y = drawSectionTitle(doc, y, "Parecer Conclusivo");
  y = drawSectionBlock(doc, y, "", model.approved ? "Sim" : "Não", redrawHeader, model.header, logoDataUrl);
  y = drawSectionBlock(doc, y, "", model.opinionText, redrawHeader, model.header, logoDataUrl);

  y = drawSectionBlock(doc, y, "Responsável pela Análise e Aprovação", model.approvalName, redrawHeader, model.header, logoDataUrl);
  y = drawSignatureRow(doc, y, "Responsável pela Análise e Aprovação", "", signatureUrl, null, redrawHeader, model.header, logoDataUrl);

  drawPersonnelPageFooters(doc, model.header);
  const slug = personnelPdfSlug([record.candidate_name]);
  doc.save(`PR-6.2F-${slug}.pdf`);
}
