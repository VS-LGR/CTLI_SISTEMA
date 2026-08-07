import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { prepareMasterDocumentExport, recordMasterDocumentExport } from "@/lib/masterDocuments/masterDocumentExportHelper";
import { drawInstitutionalPdfHeader } from "@/lib/institutionalPdf/drawHeader";
import { drawInstitutionalPageFooters } from "@/lib/institutionalPdf/drawPageFooters";
import { ML, TEXT, FORM_COLORS } from "@/lib/institutionalPdf/theme";
import { fmtDmyShort } from "@/lib/dateFormat";
import { loadTenantLogoDataUrl } from "@/lib/tenantBranding";
import { latestSheetUpdateIso } from "./buildDeviceTechnicalSheets";

const TABLE_STYLES = {
  font: "helvetica",
  fontSize: 6,
  textColor: TEXT,
};

function fmtCell(v) {
  if (v == null || v === "") return "—";
  return String(v);
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
  doc.setFontSize(8);
  doc.setTextColor(...TEXT);
  doc.text(
    `Ambiente: ${tenantName || "—"}  |  ${rows.length} linha(s)  |  Última atualização da ficha: ${lastUpdate ? fmtDmyShort(lastUpdate) : "—"}`,
    ML,
    startY + 2,
  );
  startY += 8;

  const body = (rows || []).map((r) => [
    fmtCell(r.identification),
    fmtCell(r.equipmentType),
    fmtCell(r.manufacturer),
    fmtCell(r.location),
    fmtCell(r.certificateNumber),
    fmtCell(r.calibratedBy),
    fmtDmyShort(r.calibrationDate),
    fmtDmyShort(r.nextCalibrationDate),
    fmtCell(r.intermediateCheck),
    fmtCell(r.frequencyStatus || r.calibrationFrequency),
    fmtCell(r.nominalValue),
    fmtCell(r.conventionalValue),
    fmtCell(r.errorFound),
    fmtCell(r.maxError),
    fmtCell(r.uncertainty),
    fmtCell(r.maxUncertainty),
    fmtCell(r.unit),
    fmtCell(r.equipmentClass),
    fmtCell(r.quantity),
    fmtCell(r.vcMin),
    fmtCell(r.vcMax),
    fmtCell(r.status),
    fmtCell(r.maintenancePlan),
    fmtCell(r.history),
  ]);

  autoTable(doc, {
    startY,
    margin: { left: ML, right: 8 },
    head: [[
      "Identificação", "Tipo", "Fabricante", "Localização", "Nº cert.", "Lab.",
      "Calibração", "Próxima", "Verif. interm.", "Freq./Status",
      "Nominal", "V.C.", "Erro", "EP", "Ue", "Ue máx.", "Un.",
      "Classe", "Grandeza", "V.C. mín", "V.C. máx", "Situação", "Plano manut.", "Histórico",
    ]],
    body,
    styles: { ...TABLE_STYLES, fontSize: 5 },
    headStyles: { fillColor: FORM_COLORS.tableHeader, textColor: TEXT, fontStyle: "bold", fontSize: 4.5 },
    alternateRowStyles: { fillColor: FORM_COLORS.sectionFill },
  });

  if (historyRows?.length) {
    let y = (doc.lastAutoTable?.finalY || startY) + 10;
    if (y > 180) {
      doc.addPage();
      y = drawInstitutionalPdfHeader(doc, header, logoDataUrl) + 4;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Histórico de alterações de itens", ML, y);
    y += 4;

    autoTable(doc, {
      startY: y,
      margin: { left: ML, right: 8 },
      head: [["Data", "ID / Fonte", "Campo", "De", "Para", "Nº cert."]],
      body: historyRows.map((h) => [
        fmtDmyShort(h.changed_at),
        fmtCell(h.identification || h.source_id),
        fmtCell(h.field_label || h.field_key),
        fmtCell(h.old_value),
        fmtCell(h.new_value),
        fmtCell(h.certificate_number_snapshot),
      ]),
      styles: TABLE_STYLES,
      headStyles: { fillColor: FORM_COLORS.tableHeader, textColor: TEXT, fontStyle: "bold", fontSize: 6 },
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
