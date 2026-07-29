import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { prepareMasterDocumentExport, recordMasterDocumentExport } from "@/lib/masterDocuments/masterDocumentExportHelper";
import { drawInstitutionalPdfHeader } from "@/lib/institutionalPdf/drawHeader";
import { drawInstitutionalPageFooters } from "@/lib/institutionalPdf/drawPageFooters";
import { ML, TEXT } from "@/lib/institutionalPdf/theme";
import { fmtDmyShort } from "@/lib/dateFormat";
import { loadTenantLogoDataUrl } from "@/lib/tenantBranding";
import { equipmentKindPdfFill } from "@/lib/equipmentVerifications/equipmentKindPdfColors";
import { QUARTER_LABELS } from "./maintenanceProgramsApi";

export async function downloadMaintenanceProgramPdf({
  programs = [],
  year,
  tenantId = null,
  tenantName = "",
  tenant = null,
} = {}) {
  const { meta, fileName } = await prepareMasterDocumentExport({
    tenantId,
    code: "RE-6.4.12A",
    defaultTitle: "Programa de Manutenção",
    fileNameContext: { ano: year },
  });

  const logoDataUrl = tenant ? await loadTenantLogoDataUrl(tenant) : null;
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const header = {
    title: meta?.title || "Programa de Manutenção",
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

  for (const prog of programs) {
    const pageH = doc.internal.pageSize.getHeight();
    if (startY > pageH - 50) {
      doc.addPage();
      startY = drawInstitutionalPdfHeader(doc, header, logoDataUrl) + 8;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(prog.kindLabel || prog.equipment_kind, ML, startY);
    startY += 4;

    const body = (prog.events || []).map((e) => [
      e.asset_label || "—",
      QUARTER_LABELS[(e.quarter || 1) - 1] || e.quarter,
      e.frequency || "trimestral",
      e.status === "executado" ? "Executado" : "Planejado",
      fmtDmyShort(e.planned_date),
      fmtDmyShort(e.executed_date),
      e.responsible || "",
      e.notes || "",
    ]);

    autoTable(doc, {
      startY,
      margin: { left: ML, right: 8 },
      head: [["Equipamento", "Trimestre", "Freq.", "Status", "Planejado", "Executado", "Responsável", "Obs."]],
      body: body.length ? body : [["—", "—", "—", "—", "—", "—", "—", "Sem eventos"]],
      styles: { font: "helvetica", fontSize: 7, textColor: TEXT },
      headStyles: {
        fillColor: equipmentKindPdfFill(prog.equipment_kind),
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 7,
      },
    });
    startY = (doc.lastAutoTable?.finalY || startY) + 10;
  }

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
