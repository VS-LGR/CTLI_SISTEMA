import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { prepareMasterDocumentExport, recordMasterDocumentExport } from "@/lib/masterDocuments/masterDocumentExportHelper";
import { drawInstitutionalPdfHeader } from "@/lib/institutionalPdf/drawHeader";
import { drawInstitutionalPageFooters } from "@/lib/institutionalPdf/drawPageFooters";
import { ML, TEXT } from "@/lib/institutionalPdf/theme";
import { fmtDmyShort } from "@/lib/dateFormat";
import { loadTenantLogoDataUrl } from "@/lib/tenantBranding";

const TABLE_STYLES = {
  font: "helvetica",
  fontSize: 6.5,
  textColor: TEXT,
};

export async function downloadDeviceTechnicalSheetPdf(rows, {
  tenantId = null,
  tenantName = "",
  tenant = null,
  logoDataUrl: preloadedLogo = null,
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

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...TEXT);
  doc.text(
    `Ambiente: ${tenantName || "—"}  |  ${rows.length} linha(s)`,
    ML,
    startY + 2,
  );
  startY += 8;

  const body = (rows || []).map((r) => [
    r.identification || "",
    r.equipmentType || "",
    r.manufacturer || "",
    r.certificateNumber || "",
    fmtDmyShort(r.calibrationDate),
    fmtDmyShort(r.nextCalibrationDate),
    r.nominalValue || "",
    r.conventionalValue || "",
    r.uncertainty || "",
    r.unit || "",
    r.equipmentClass || "",
    r.quantity || "",
    r.status || "",
  ]);

  autoTable(doc, {
    startY,
    margin: { left: ML, right: 10 },
    head: [[
      "ID", "Tipo", "Fabricante", "Nº cert.", "Calibração", "Próxima",
      "Nominal", "V.C.", "Ue", "Un.", "Classe", "Grandeza", "Situação",
    ]],
    body,
    styles: TABLE_STYLES,
    headStyles: { fillColor: [37, 99, 235], textColor: TEXT, fontStyle: "bold", fontSize: 6.5 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

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
