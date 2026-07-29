import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { prepareMasterDocumentExport, recordMasterDocumentExport } from "@/lib/masterDocuments/masterDocumentExportHelper";
import { drawInstitutionalPdfHeader } from "@/lib/institutionalPdf/drawHeader";
import { drawInstitutionalPageFooters } from "@/lib/institutionalPdf/drawPageFooters";
import { ML, TEXT } from "@/lib/institutionalPdf/theme";
import { loadTenantLogoDataUrl } from "@/lib/tenantBranding";
import { equipmentKindPdfFill } from "@/lib/equipmentVerifications/equipmentKindPdfColors";

const MONTH_SHORT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export async function downloadCalibrationSchedulePdf({
  yearStart,
  years,
  rows,
  tenantId = null,
  tenantName = "",
  tenant = null,
} = {}) {
  const { meta, fileName } = await prepareMasterDocumentExport({
    tenantId,
    code: "RE-6.4A",
    defaultTitle: "Cronograma de Calibração",
    fileNameContext: { ano: yearStart },
  });

  const logoDataUrl = tenant ? await loadTenantLogoDataUrl(tenant) : null;
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const header = {
    title: meta?.title || "Cronograma de Calibração",
    code: meta?.code || "RE-6.4A",
    reference: meta?.reference || "PR-6.4",
    revision: meta?.revision || "00",
    modelIssueDate: meta?.modelIssueDate || null,
  };
  let startY = drawInstitutionalPdfHeader(doc, header, logoDataUrl);
  doc.setFontSize(8);
  doc.setTextColor(...TEXT);
  doc.text(`Ambiente: ${tenantName || "—"}  |  Período: ${years[0]}–${years[years.length - 1]}`, ML, startY + 2);
  startY += 8;

  const focusYear = years[0];
  const head = ["Certificado", "Situação", ...MONTH_SHORT];
  const body = [];
  for (const r of rows || []) {
    body.push([
      r.label,
      "Previsto",
      ...MONTH_SHORT.map((_, i) => (r.marks?.[focusYear]?.previsto?.[i + 1] ? "X" : "")),
    ]);
    body.push([
      "",
      "Realizado",
      ...MONTH_SHORT.map((_, i) => (r.marks?.[focusYear]?.realizado?.[i + 1] ? "X" : "")),
    ]);
  }

  autoTable(doc, {
    startY,
    margin: { left: ML, right: 8 },
    head: [head],
    body,
    styles: { font: "helvetica", fontSize: 6.5, textColor: TEXT, halign: "center" },
    columnStyles: { 0: { cellWidth: 55, halign: "left" }, 1: { cellWidth: 22, halign: "left" } },
    headStyles: {
      fillColor: equipmentKindPdfFill("pesos"),
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 6.5,
    },
  });

  drawInstitutionalPageFooters(doc);
  doc.save(fileName);

  if (tenantId && meta?.id) {
    await recordMasterDocumentExport({
      tenantId,
      meta,
      fileName,
      sourceModule: "re64a_cronograma",
      sourceRecordId: null,
    });
  }
  return { fileName };
}
