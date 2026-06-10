import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { drawInstitutionalPdfHeaderWithCenterLines } from "@/lib/institutionalPdf/drawHeader";
import { drawInstitutionalPageFooters } from "@/lib/institutionalPdf/drawPageFooters";
import { ML, MR, PAGE_H, PAGE_W, TEXT } from "@/lib/institutionalPdf/theme";
import { buildQuotationRequestPdfViewModel } from "./viewModel";

const HEADER_GRAY = [217, 217, 217];
const BORDER = [180, 180, 180];

function drawWatermark(doc, text) {
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(48);
    doc.setTextColor(220, 220, 220);
    doc.text(text, PAGE_W / 2, 148, { align: "center", angle: 35 });
    doc.setTextColor(...TEXT);
  }
}

function drawHeader(doc, model, logoDataUrl, yStart = 8) {
  return drawInstitutionalPdfHeaderWithCenterLines(doc, logoDataUrl, yStart, {
    title: model.header.title,
    titleFontSize: 12,
    centerLines: [
      { text: `DATA: ${model.header.requestDate}`, fontSize: 8 },
      { text: `Nº: ${model.header.requestNumber}`, bold: true, fontSize: 9 },
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

function ensureSpace(doc, y, needed, model, logoDataUrl) {
  if (y + needed > PAGE_H - 15) {
    doc.addPage();
    return drawHeader(doc, model, logoDataUrl, 8);
  }
  return y;
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

function drawKeyValueTable(doc, y, rows) {
  autoTable(doc, {
    startY: y,
    margin: { left: ML, right: PAGE_W - MR },
    theme: "grid",
    styles: { fontSize: 7, cellPadding: 1.5, lineColor: BORDER, lineWidth: 0.1 },
    headStyles: { fillColor: HEADER_GRAY, textColor: TEXT, fontStyle: "bold" },
    head: [["Campo", "Valor"]],
    body: rows,
    columnStyles: { 0: { cellWidth: 45 }, 1: { cellWidth: "auto" } },
  });
  return doc.lastAutoTable.finalY + 4;
}

export function drawQuotationRequestPdf(request, { logoDataUrl } = {}) {
  const model = buildQuotationRequestPdfViewModel(request);
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = drawHeader(doc, model, logoDataUrl);

  y = drawSectionTitle(doc, y, "Solicitante");
  y = drawKeyValueTable(doc, y, [
    ["Razão Social", model.requester.legalName],
    ["Endereço", model.requester.address],
    ["Fone/Fax", model.requester.phone],
    ["E-mail", model.requester.email],
    ["CNPJ", model.requester.cnpj],
    ["Enviado por", model.requester.sentBy],
  ]);

  y = ensureSpace(doc, y, 40, model, logoDataUrl);
  y = drawSectionTitle(doc, y, "Fornecedor");
  y = drawKeyValueTable(doc, y, [
    ["Empresa", model.supplier.company],
    ["Endereço", model.supplier.address],
    ["Fone", model.supplier.phone],
    ["CNPJ", model.supplier.cnpj],
    ["E-mail", model.supplier.email],
    ["Contato", model.supplier.contact],
  ]);

  for (const sec of model.sections) {
    y = ensureSpace(doc, y, 25, model, logoDataUrl);
    y = drawSectionTitle(doc, y, sec.title);

    if (sec.isPep) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text("Escopo do Ensaio:", ML, y);
      y += 4;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      const scopeLines = doc.splitTextToSize(sec.essayScope, MR - ML - 4);
      for (const line of scopeLines) {
        y = ensureSpace(doc, y, 5, model, logoDataUrl);
        doc.text(line, ML + 2, y);
        y += 3.5;
      }
      y += 2;
      doc.setFont("helvetica", "bold");
      doc.text("Critérios para Aquisição:", ML, y);
      y += 4;
      doc.setFont("helvetica", "normal");
      const critLines = doc.splitTextToSize(sec.acquisitionCriteria, MR - ML - 4);
      for (const line of critLines) {
        y = ensureSpace(doc, y, 5, model, logoDataUrl);
        doc.text(line, ML + 2, y);
        y += 3.5;
      }
      y += 4;
      continue;
    }

    if (sec.rows.length && sec.columns.length) {
      y = ensureSpace(doc, y, 20, model, logoDataUrl);
      autoTable(doc, {
        startY: y,
        margin: { left: ML, right: PAGE_W - MR },
        theme: "grid",
        styles: { fontSize: 6.5, cellPadding: 1.2, lineColor: BORDER, lineWidth: 0.1, overflow: "linebreak" },
        headStyles: { fillColor: HEADER_GRAY, textColor: TEXT, fontStyle: "bold", fontSize: 6.5 },
        head: [sec.columns.map((c) => c.header)],
        body: sec.rows.map((row) => sec.columns.map((c) => row[c.dataKey] ?? "-")),
        rowPageBreak: "avoid",
      });
      y = doc.lastAutoTable.finalY + 4;
    }

    if (sec.notes && sec.notes !== "-") {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(7);
      doc.text(`Obs.: ${sec.notes}`, ML, y);
      y += 5;
    }
  }

  if (model.notes && model.notes !== "-") {
    y = ensureSpace(doc, y, 12, model, logoDataUrl);
    y = drawSectionTitle(doc, y, "Observações gerais");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    const lines = doc.splitTextToSize(model.notes, MR - ML - 4);
    for (const line of lines) {
      y = ensureSpace(doc, y, 5, model, logoDataUrl);
      doc.text(line, ML + 2, y);
      y += 3.5;
    }
  }

  if (model.isDraft) drawWatermark(doc, "RASCUNHO");

  drawInstitutionalPageFooters(doc);

  const num = model.header.requestNumber.replace(/\//g, "-");
  doc.save(`solicitacao-orcamento-${num}.pdf`);
}
