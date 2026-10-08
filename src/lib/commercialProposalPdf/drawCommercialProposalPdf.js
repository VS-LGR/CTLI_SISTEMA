import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { companyFromSources, drawGuideSectionTitle, drawHtmlFormFooters, drawHtmlFormHeader } from "@/lib/institutionalPdf/htmlFormChrome";
import { formatDateBr } from "@/lib/quotationRequestDisplay";
import { HTML_FORM, ML, MR, PAGE_H, PAGE_W, TEXT } from "@/lib/institutionalPdf/theme";
import { buildCommercialProposalPdfViewModel } from "./viewModel";

function ensureSpace(doc, y, needed, drawPageHeader, logoDataUrl, model) {
  if (y + needed > PAGE_H - 15) {
    doc.addPage();
    return drawPageHeader(doc, model, logoDataUrl, 8);
  }
  return y;
}

function drawPageHeader(doc, model, logoDataUrl, yStart = 8) {
  const withControl = !model._controlDrawn;
  model._controlDrawn = true;
  let y = drawHtmlFormHeader(doc, {
    logoDataUrl,
    company: model.company,
    title: model.header.title,
    code: model.header.code,
    reference: model.header.reference || "",
    revision: model.header.revision,
    emission: /^\d{4}-\d{2}-\d{2}/.test(String(model.header.modelIssueDate || ""))
      ? formatDateBr(String(model.header.modelIssueDate).slice(0, 10))
      : (model.header.modelIssueDate || ""),
    elaborado: model.header.elaboratedBy || "",
    verificado: model.header.verifiedBy || "",
    aprovado: model.header.approvedBy || "",
    withControl,
    yStart,
  });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...TEXT);
  doc.text(
    `Proposta nº ${model.header.proposalNumber}    Data ${model.header.proposalDate}`,
    ML,
    y + 3.5,
  );
  return y + 7;
}

function drawSectionTitle(doc, y, title) {
  return drawGuideSectionTitle(doc, ML, y, MR - ML, title, 10);
}

function drawParagraphs(doc, y, text, drawPageHeader, logoDataUrl, model, fontSize = 8) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(fontSize);
  const lineStep = Math.max(4.8, fontSize * 0.62);
  const blocks = String(text || "").split(/\n+/).map((block) => block.trim()).filter(Boolean);
  blocks.forEach((block, blockIndex) => {
    const lines = doc.splitTextToSize(block, MR - ML - 4);
    lines.forEach((line, lineIndex) => {
      if (blockIndex === 0 && lineIndex === 0) y += 1.5;
      y = ensureSpace(doc, y, 6, drawPageHeader, logoDataUrl, model);
      doc.text(line, ML + 2, y);
      y += lineStep;
    });
    y += 1.4;
  });
  return y + 1.5;
}

export function drawCommercialProposalPdf(proposal, { logoDataUrl, documentMeta, tenant, fileName } = {}) {
  const model = buildCommercialProposalPdfViewModel(proposal, tenant);
  if (documentMeta) {
    model.header.code = documentMeta.code || model.header.code;
    model.header.reference = documentMeta.reference || model.header.reference;
    model.header.revision = documentMeta.revision || model.header.revision;
    model.header.modelIssueDate = documentMeta.modelIssueDate || model.header.modelIssueDate;
    model.header.elaboratedBy = documentMeta.elaboratedBy || "";
    model.header.verifiedBy = documentMeta.verifiedBy || "";
    model.header.approvedBy = documentMeta.approvedBy || "";
  }
  model.company = companyFromSources({ tenant, fallbackName: model.labName });

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = drawPageHeader(doc, model, logoDataUrl);
  y += 2;
  y = drawSectionTitle(doc, y, "Cliente");

  autoTable(doc, {
    startY: y,
    margin: { left: ML, right: PAGE_W - MR },
    theme: "grid",
    styles: { fontSize: 8, cellPadding: 2.2, lineColor: HTML_FORM.border, lineWidth: 0.15, textColor: TEXT },
    body: [
      ["Empresa", model.client.company],
      ["Endereço", model.client.address],
      ["Departamento", model.client.department],
      ["A/C", model.client.attentionTo],
      ["Telefone(s)", model.client.phone],
      ["Email", model.client.email],
    ],
    columnStyles: { 0: { cellWidth: 35, fontStyle: "bold", fillColor: HTML_FORM.label }, 1: { cellWidth: "auto" } },
    alternateRowStyles: { fillColor: HTML_FORM.zebra },
  });
  y = doc.lastAutoTable.finalY + 4;

  y = ensureSpace(doc, y, 12, drawPageHeader, logoDataUrl, model);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text(`Assunto: ${model.subject}`, ML, y);
  y += 5;
  y = drawParagraphs(doc, y, model.introText, drawPageHeader, logoDataUrl, model);

  y = ensureSpace(doc, y, 20, drawPageHeader, logoDataUrl, model);
  y = drawSectionTitle(doc, y, "Itens de calibração");
  autoTable(doc, {
    startY: y,
    margin: { left: ML, right: PAGE_W - MR },
    theme: "grid",
    styles: { fontSize: 7.5, cellPadding: 2, lineColor: HTML_FORM.border, lineWidth: 0.15, overflow: "linebreak", textColor: TEXT },
    headStyles: { fillColor: HTML_FORM.titleBar, textColor: HTML_FORM.text, fontStyle: "bold", fontSize: 7 },
    alternateRowStyles: { fillColor: HTML_FORM.zebra },
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

  if ((model.weightRows || []).length) {
    y = ensureSpace(doc, y, 20, drawPageHeader, logoDataUrl, model);
    y = drawSectionTitle(doc, y, "Pesos-padrão");
    autoTable(doc, {
      startY: y,
      margin: { left: ML, right: PAGE_W - MR },
      theme: "grid",
      styles: { fontSize: 7.5, cellPadding: 2, lineColor: HTML_FORM.border, lineWidth: 0.15, overflow: "linebreak", textColor: TEXT },
      headStyles: { fillColor: HTML_FORM.titleBar, textColor: HTML_FORM.text, fontStyle: "bold", fontSize: 7 },
      alternateRowStyles: { fillColor: HTML_FORM.zebra },
      head: [["Pesos-padrão — Identificação", "Nominal", "Classe", "Série", "Fabricante", "Valor Unit. (R$)"]],
      body: model.weightRows.map((r) => [
        r.identification, r.nominal, r.class, r.serial, r.manufacturer, r.unit_value,
      ]),
    });
    y = doc.lastAutoTable.finalY + 4;
  }

  if ((model.coletaRefs || []).length) {
    y = ensureSpace(doc, y, 12, drawPageHeader, logoDataUrl, model);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("Coletas / O.S. geradas a partir desta proposta", ML, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    model.coletaRefs.forEach((line) => {
      doc.text(`• ${line}`, ML + 2, y);
      y += 3.5;
    });
    y += 2;
  }

  y = drawParagraphs(doc, y, model.mileageNote, drawPageHeader, logoDataUrl, model, 8);

  y = ensureSpace(doc, y, 14, drawPageHeader, logoDataUrl, model);
  y = drawSectionTitle(doc, y, "Necessidade de Ajustes");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
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
  y += 2;
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

  drawHtmlFormFooters(doc, { code: model.header.code, revision: model.header.revision });
  doc.save(fileName || `proposta-${model.header.proposalNumber.replace(/\//g, "-")}.pdf`);
}
