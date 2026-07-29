import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { prepareMasterDocumentExport, recordMasterDocumentExport } from "@/lib/masterDocuments/masterDocumentExportHelper";
import { drawInstitutionalPdfHeader } from "@/lib/institutionalPdf/drawHeader";
import { drawInstitutionalPageFooters } from "@/lib/institutionalPdf/drawPageFooters";
import { ML, TEXT } from "@/lib/institutionalPdf/theme";
import { fmtDmyShort } from "@/lib/dateFormat";
import { loadTenantLogoDataUrl } from "@/lib/tenantBranding";
import {
  MONTH_SHORT,
  MONTH_KEYS,
  buildMaintenanceScheduleRows,
  markSymbol,
} from "./maintenanceProgramsApi";

export async function downloadMaintenanceProgramPdf({
  programs = [],
  year,
  rows: rowsIn = null,
  issuedApprovedBy = "",
  updatedAt = null,
  tenantId = null,
  tenantName = "",
  tenant = null,
} = {}) {
  const { meta, fileName } = await prepareMasterDocumentExport({
    tenantId,
    code: "RE-6.4.12A",
    defaultTitle: "Programa de Manutenção Preventiva",
    fileNameContext: { ano: year },
  });

  const built = rowsIn
    ? { rows: rowsIn, issuedApprovedBy, updatedAt }
    : buildMaintenanceScheduleRows({ programs });
  const rows = built.rows || [];
  const approved = issuedApprovedBy || built.issuedApprovedBy || "";
  const lastUpdate = updatedAt || built.updatedAt;

  const logoDataUrl = tenant ? await loadTenantLogoDataUrl(tenant) : null;
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const header = {
    title: meta?.title || "Programa de Manutenção Preventiva",
    code: meta?.code || "RE-6.4.12A",
    reference: meta?.reference || "PR-6.4.12",
    revision: meta?.revision || "00",
    modelIssueDate: meta?.modelIssueDate || null,
  };
  let startY = drawInstitutionalPdfHeader(doc, header, logoDataUrl);
  doc.setFontSize(8);
  doc.setTextColor(...TEXT);
  doc.text(`Ambiente: ${tenantName || "—"}  |  Ano: ${year}`, ML, startY + 2);
  startY += 8;

  const body = rows.map((r) => [
    r.label,
    ...MONTH_KEYS.map((m) => markSymbol(r.marks?.[m]) || ""),
  ]);

  autoTable(doc, {
    startY,
    margin: { left: ML, right: 8 },
    head: [["Equipamentos", ...MONTH_SHORT]],
    body: body.length ? body : [["—", ...MONTH_KEYS.map(() => "")]],
    styles: { font: "helvetica", fontSize: 8, textColor: TEXT, halign: "center" },
    columnStyles: { 0: { halign: "left", cellWidth: 70 } },
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 7,
      halign: "center",
    },
    didParseCell: (data) => {
      if (data.section !== "body" || data.column.index === 0) return;
      const v = String(data.cell.raw || "");
      if (v === "y") {
        data.cell.styles.fillColor = [22, 163, 74];
        data.cell.styles.textColor = [255, 255, 255];
        data.cell.styles.fontStyle = "bold";
      } else if (v === "x") {
        data.cell.styles.fillColor = [224, 242, 254];
        data.cell.styles.textColor = [3, 105, 161];
        data.cell.styles.fontStyle = "bold";
      }
    },
  });

  let y = (doc.lastAutoTable?.finalY || startY) + 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...TEXT);
  doc.text(`Elaborado e Aprovado por: ${approved || "—"}`, ML, y);
  doc.text("Legenda: x = planejado    y = executado", ML + 90, y);
  doc.text(`Última atualização: ${lastUpdate ? fmtDmyShort(lastUpdate) : "—"}`, ML + 170, y);

  drawInstitutionalPageFooters(doc);
  doc.save(fileName);

  if (tenantId && meta?.id) {
    await recordMasterDocumentExport({
      tenantId,
      meta,
      fileName,
      sourceModule: "re6412a_manutencao",
      sourceRecordId: null,
    });
  }
  return { fileName };
}
