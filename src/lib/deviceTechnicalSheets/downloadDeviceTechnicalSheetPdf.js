import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { prepareMasterDocumentExport, recordMasterDocumentExport } from "@/lib/masterDocuments/masterDocumentExportHelper";
import { drawInstitutionalPdfHeader } from "@/lib/institutionalPdf/drawHeader";
import { drawInstitutionalPageFooters } from "@/lib/institutionalPdf/drawPageFooters";
import { BORDER, FONT, FORM_COLORS, ML, TEXT } from "@/lib/institutionalPdf/theme";
import { fmtDmyShort } from "@/lib/dateFormat";
import { loadTenantLogoDataUrl } from "@/lib/tenantBranding";
import { latestSheetUpdateIso } from "./buildDeviceTechnicalSheets";
import {
  SHEET_SUMMARY_HEAD,
  sheetDetailPairs,
  sheetSummaryCells,
} from "./deviceTechnicalSheetPdfModel";

const TABLE_STYLES = {
  font: "helvetica",
  fontSize: FONT.body,
  textColor: TEXT,
  lineColor: BORDER,
  lineWidth: 0.15,
  cellPadding: 1.6,
  overflow: "linebreak",
};

function pageBottom(doc) {
  return doc.internal.pageSize.getHeight() - 16;
}

function pageRight(doc) {
  return doc.internal.pageSize.getWidth() - 10;
}

function drawDetailCard(doc, row, y, header, logoDataUrl) {
  const pairs = sheetDetailPairs(row);
  const left = pairs.filter((_, index) => index % 2 === 0);
  const right = pairs.filter((_, index) => index % 2 === 1);
  const rows = Math.max(left.length, right.length);
  const cardH = 8 + rows * 4.6;
  if (y + cardH > pageBottom(doc)) {
    doc.addPage();
    y = drawInstitutionalPdfHeader(doc, header, logoDataUrl) + 4;
  }
  const width = pageRight(doc) - ML;
  doc.setFillColor(...FORM_COLORS.sectionBar);
  doc.rect(ML, y, width, 6.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(FONT.sectionTitle);
  doc.setTextColor(...TEXT);
  doc.text(`${row.identification || "Equipamento"}  ·  ${row.equipmentType || ""}`.trim(), ML + 2, y + 4.5);
  y += 9;
  doc.setFontSize(FONT.body);
  for (let index = 0; index < rows; index += 1) {
    const pairLeft = left[index];
    const pairRight = right[index];
    const leftLines = pairLeft ? doc.splitTextToSize(String(pairLeft[1]), 78) : [];
    const rightLines = pairRight ? doc.splitTextToSize(String(pairRight[1]), 78) : [];
    const lineCount = Math.max(leftLines.length, rightLines.length, 1);
    if (y + lineCount * 4.2 > pageBottom(doc)) {
      doc.addPage();
      y = drawInstitutionalPdfHeader(doc, header, logoDataUrl) + 6;
    }
    if (pairLeft) {
      doc.setFont("helvetica", "bold");
      doc.text(pairLeft[0], ML, y);
      doc.setFont("helvetica", "normal");
      doc.text(leftLines, ML + 48, y);
    }
    if (pairRight) {
      const x = ML + width / 2;
      doc.setFont("helvetica", "bold");
      doc.text(pairRight[0], x, y);
      doc.setFont("helvetica", "normal");
      doc.text(rightLines, x + 48, y);
    }
    y += lineCount * 4.2 + 0.6;
  }
  return y + 3;
}

export async function downloadDeviceTechnicalSheetPdf(rows, {
  tenantId = null,
  tenantName = "",
  tenant = null,
  logoDataUrl: preloadedLogo = null,
  historyRows = [],
} = {}) {
  const { meta, fileName } = await prepareMasterDocumentExport({
    tenantId,
    code: "RE-6.4B",
    defaultTitle: "Ficha Técnica de Dispositivos",
    fileNameContext: { ano: new Date().getFullYear() },
  });

  const logoDataUrl = preloadedLogo
    || (tenant ? await loadTenantLogoDataUrl(tenant) : null);

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const header = {
    title: meta?.title || "Ficha Técnica de Dispositivos",
    code: meta?.code || "RE-6.4B",
    reference: meta?.reference || "PR-6.4",
    revision: meta?.revision || "00",
    modelIssueDate: meta?.modelIssueDate || null,
  };
  let startY = drawInstitutionalPdfHeader(doc, header, logoDataUrl);

  const lastUpdate = latestSheetUpdateIso(rows);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(FONT.body);
  doc.setTextColor(...TEXT);
  const intro = doc.splitTextToSize(
    `Ambiente: ${tenantName || "—"}   ·   ${rows?.length || 0} equipamento(s)   ·   Leitura da ficha: ${lastUpdate ? fmtDmyShort(lastUpdate) : "—"}. Este PDF não altera o cadastro.`,
    pageRight(doc) - ML,
  );
  doc.text(intro, ML, startY + 2);
  startY += intro.length * 4 + 4;

  autoTable(doc, {
    startY,
    margin: { left: ML, right: 10, top: 28, bottom: 14 },
    head: [SHEET_SUMMARY_HEAD],
    body: (rows || []).map((row) => sheetSummaryCells(row, fmtDmyShort)),
    styles: TABLE_STYLES,
    headStyles: { fillColor: FORM_COLORS.tableHeader, textColor: TEXT, fontStyle: "bold", fontSize: FONT.body },
    alternateRowStyles: { fillColor: FORM_COLORS.sectionFill },
    didDrawPage: (data) => {
      if (data.pageNumber > 1) drawInstitutionalPdfHeader(doc, header, logoDataUrl);
    },
  });

  let y = (doc.lastAutoTable?.finalY || startY) + 8;
  if (y > pageBottom(doc) - 20) {
    doc.addPage();
    y = drawInstitutionalPdfHeader(doc, header, logoDataUrl) + 4;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(FONT.docTitle);
  doc.setTextColor(...TEXT);
  doc.text("Detalhe metrológico", ML, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(FONT.bodyCompact);
  doc.setTextColor(...FORM_COLORS.accent);
  doc.text("Classe determinada pela Ue. A classe registada é a do cadastro do peso e continua editável.", ML, y);
  doc.setTextColor(...TEXT);
  y += 6;

  (rows || []).forEach((row) => {
    y = drawDetailCard(doc, row, y, header, logoDataUrl);
  });

  if (historyRows?.length) {
    if (y > pageBottom(doc) - 24) {
      doc.addPage();
      y = drawInstitutionalPdfHeader(doc, header, logoDataUrl) + 4;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(FONT.sectionTitle);
    doc.text("Histórico de alterações de itens", ML, y);
    y += 3;
    autoTable(doc, {
      startY: y,
      margin: { left: ML, right: 10, top: 28, bottom: 14 },
      head: [["Data", "ID / Fonte", "Campo", "De", "Para", "Nº cert."]],
      body: historyRows.map((item) => [
        fmtDmyShort(item.changed_at),
        item.identification || item.source_id || "—",
        item.field_label || item.field_key || "—",
        item.old_value || "—",
        item.new_value || "—",
        item.certificate_number_snapshot || "—",
      ]),
      styles: TABLE_STYLES,
      headStyles: { fillColor: FORM_COLORS.tableHeader, textColor: TEXT, fontStyle: "bold", fontSize: FONT.body },
      didDrawPage: (data) => {
        if (data.pageNumber > 1) drawInstitutionalPdfHeader(doc, header, logoDataUrl);
      },
    });
  }

  drawInstitutionalPageFooters(doc);
  doc.save(fileName);

  if (tenantId && meta?.id) {
    await recordMasterDocumentExport({
      tenantId,
      meta,
      fileName,
      sourceModule: "re64b_ficha_tecnica",
      sourceRecordId: null,
    });
  }

  return { fileName };
}
