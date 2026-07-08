import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { prepareMasterDocumentExport, recordMasterDocumentExport } from "@/lib/masterDocuments/masterDocumentExportHelper";
import { drawInstitutionalReportHeader } from "@/lib/institutionalPdf/drawHeader";
import { drawInstitutionalPageFooters } from "@/lib/institutionalPdf/drawPageFooters";
import { ML, TEXT } from "@/lib/institutionalPdf/theme";
import { fmtDmyShort } from "@/lib/dateFormat";

const TABLE_STYLES = {
  font: "helvetica",
  fontSize: 6.5,
  textColor: TEXT,
};

export async function downloadDeviceTechnicalSheetPdf(rows, {
  tenantId = null,
  tenantName = "",
} = {}) {
  const today = new Date().toISOString().slice(0, 10);
  const { meta, fileName } = await prepareMasterDocumentExport({
    tenantId,
    code: "RE-6.4B",
    defaultTitle: "Ficha Técnica de Dispositivos",
    fileNameContext: { ano: new Date().getFullYear() },
  });

  const doc = new jsPDF({ orientation: "landscape" });
  const startY = drawInstitutionalReportHeader(doc, {
    title: "Ficha Técnica de Dispositivos (RE-6.4B)",
    subtitle: `Ambiente: ${tenantName || "—"}  |  Emissão: ${fmtDmyShort(today)}  |  ${rows.length} linha(s)`,
  });

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
    startY: startY + 4,
    margin: { left: ML },
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
