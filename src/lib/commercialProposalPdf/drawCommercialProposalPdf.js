import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { drawInstitutionalPdfHeaderWithCenterLines } from "@/lib/institutionalPdf/drawHeader";
import { drawInstitutionalPageFooters } from "@/lib/institutionalPdf/drawPageFooters";
import { ML, MR, PAGE_H, PAGE_W, TEXT } from "@/lib/institutionalPdf/theme";
import { buildCommercialProposalPdfViewModel } from "./viewModel";

const HEADER_GRAY = [217, 217, 217];
const BORDER = [180, 180, 180];

function ensureSpace(doc, y, needed, drawPageHeader, logoDataUrl, model) {
  if (y + needed > PAGE_H - 15) {
    doc.addPage();
    return drawPageHeader(doc, model, logoDataUrl, 8);
  }
  return y;
}

function drawPageHeader(doc, model, logoDataUrl, yStart = 8) {
  return drawInstitutionalPdfHeaderWithCenterLines(doc, logoDataUrl, yStart, {
    title: model.header.title,
    titleFontSize: 12,
    centerLines: [
      { text: `Proposta nº: ${model.header.proposalNumber}`, bold: true, fontSize: 9 },
      { text: `Data: ${model.header.proposalDate}`, fontSize: 8 },
    ],
    metaLines: [
      `Cód.: ${model.header.code}`,
      `Ref.: ${model.header.reference}`,
      `Rev.: ${model.header.revision}`,
      `Emissão: ${model.header.modelIssueDate}`,
    ],
    minBottom: 22,
  });
}

function drawSectionTitle(doc, y, title) {
  doc.setFillColor(...HEADER_GRAY);
  doc.setDrawColor(...BORDER);
  doc.rect(ML, y, MR - ML, 7, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...TEXT);
  doc.text(title, ML + 2, y + 5);
  return y + 9;
}

function drawParagraphs(doc, y, text, drawPageHeader, logoDataUrl, model, fontSize = 7) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(fontSize);
  const blocks = String(text || "").split(/\n+/);
  for (const block of blocks) {
    const lines = doc.splitTextToSize(block.trim(), MR - ML - 4);
    for (const line of lines) {
      y = ensureSpace(doc, y, 5, drawPageHeader, logoDataUrl, model);
      doc.text(line, ML + 2, y);
      y += 3.5;
    }
    y += 1;
  }
  return y + 2;
}

export function drawCommercialProposalPdf(proposal, { logoDataUrl, documentMeta, tenant, fileName } = {}) {
  const model = buildCommercialProposalPdfViewModel(proposal, tenant);
  if (documentMeta) {
    model.header.code = documentMeta.code || model.header.code;
    model.header.reference = documentMeta.reference || model.header.reference;
    model.header.revision = documentMeta.revision || model.header.revision;
    model.header.modelIssueDate = documentMeta.modelIssueDate || model.header.modelIssueDate;
  }

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = drawPageHeader(doc, model, logoDataUrl);

  autoTable(doc, {
    startY: y,
    margin: { left: ML, right: PAGE_W - MR },
    theme: "grid",
    styles: { fontSize: 7, cellPadding: 1.5, lineColor: BORDER, lineWidth: 0.1 },
    body: [
      ["Empresa", model.client.company],
      ["Endereço", model.client.address],
      ["Departamento", model.client.department],
      ["A/C", model.client.attentionTo],
      ["Telefone(s)", model.client.phone],
      ["Email", model.client.email],
    ],
    columnStyles: { 0: { cellWidth: 35, fontStyle: "bold", fillColor: HEADER_GRAY }, 1: { cellWidth: "auto" } },
  });
  y = doc.lastAutoTable.finalY + 4;

  y = ensureSpace(doc, y, 12, drawPageHeader, logoDataUrl, model);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text(`Assunto: ${model.subject}`, ML, y);
  y += 5;
  y = drawParagraphs(doc, y, model.introText, drawPageHeader, logoDataUrl, model);

  y = ensureSpace(doc, y, 20, drawPageHeader, logoDataUrl, model);
  autoTable(doc, {
    startY: y,
    margin: { left: ML, right: PAGE_W - MR },
    theme: "grid",
    styles: { fontSize: 6.5, cellPadding: 1.2, lineColor: BORDER, lineWidth: 0.1, overflow: "linebreak" },
    headStyles: { fillColor: HEADER_GRAY, textColor: TEXT, fontStyle: "bold", fontSize: 6.5 },
    head: [["Marca", "Modelo", "Tag", "Série", "Capacidade", "Divisão/Res.", "Pontos de Calibração", "Valor Unit. (R$)"]],
    body: [
      ...model.scaleRows.map((r) => [
        r.manufacturer, r.model, r.tag, r.serial, r.capacity, r.resolution, r.points, r.unit_value,
      ]),
      ["", "", "", "", "", "", "Valor Total (R$)", model.totalValue],
    ],
    columnStyles: {
      0: { cellWidth: 18 },
      1: { cellWidth: 18 },
      2: { cellWidth: 14 },
      3: { cellWidth: 18 },
      4: { cellWidth: 20 },
      5: { cellWidth: 18 },
      6: { cellWidth: 28 },
      7: { cellWidth: 22 },
    },
  });
  y = doc.lastAutoTable.finalY + 4;

  y = drawParagraphs(doc, y, model.mileageNote, drawPageHeader, logoDataUrl, model, 7);

  y = ensureSpace(doc, y, 14, drawPageHeader, logoDataUrl, model);
  y = drawSectionTitle(doc, y, "Necessidade de Ajustes");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text(`A calibração será executada antes de possíveis ajustes?  ${model.adjustBefore}`, ML + 2, y);
  y += 4;
  doc.text(`A calibração será executada depois de possíveis ajustes?  ${model.adjustAfter}`, ML + 2, y);
  y += 6;

  if (model.notes && model.notes !== "-") {
    doc.setFont("helvetica", "bold");
    doc.text("Observações:", ML, y);
    y += 4;
    y = drawParagraphs(doc, y, model.notes, drawPageHeader, logoDataUrl, model);
  }

  const sections = [
    ["Responsabilidades do Cliente", model.boilerplate.responsibilities],
    ["Condições de fornecimento", model.boilerplate.supplyConditions],
    ["Informação Técnica", model.boilerplate.technicalInfo],
    ["Condição de Pagamento", model.boilerplate.payment],
    ["Horário de Trabalho", model.boilerplate.workingHours],
    ["Validade da Proposta", model.boilerplate.validity],
  ];

  for (const [title, body] of sections) {
    y = ensureSpace(doc, y, 15, drawPageHeader, logoDataUrl, model);
    y = drawSectionTitle(doc, y, title);
    y = drawParagraphs(doc, y, body, drawPageHeader, logoDataUrl, model);
  }

  y = ensureSpace(doc, y, 30, drawPageHeader, logoDataUrl, model);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Atenciosamente,", ML, y);
  y += 10;
  doc.text("DE ACORDO", ML, y);
  y += 8;
  doc.text("Nome Legível: _______________________________", ML, y);
  y += 5;
  doc.text("Departamento: ______________________________", ML, y);
  y += 5;
  doc.text("Telefone: ___________________________________", ML, y);
  y += 5;
  doc.text("Assinatura __________________________________", ML, y);
  y += 5;
  doc.text("Data: ______________________________________", ML, y);
  y += 10;
  doc.text("Gerente administrativo", ML, y);
  y += 12;
  doc.text(`Gerente Técnico da ${model.labName}`, ML, y);

  drawInstitutionalPageFooters(doc);
  doc.save(fileName || `proposta-${model.header.proposalNumber.replace(/\//g, "-")}.pdf`);
}
