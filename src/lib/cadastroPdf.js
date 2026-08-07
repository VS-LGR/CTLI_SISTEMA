import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { fmtDmyShort } from "@/lib/dateFormat";
import { drawInstitutionalReportHeader } from "@/lib/institutionalPdf/drawHeader";
import { drawInstitutionalPageFooters } from "@/lib/institutionalPdf/drawPageFooters";
import { ML, TEXT, FORM_COLORS } from "@/lib/institutionalPdf/theme";

const TABLE_STYLES = {
  font: "helvetica",
  fontSize: 7,
  textColor: TEXT,
};

/**
 * @param {Array<Record<string, unknown>>} rows weight_standard_certificates
 * @param {string} tenantName
 */
export async function downloadWeightCertificatesValidPdf(rows, tenantName) {
  const today = new Date().toISOString().slice(0, 10);
  const valid = rows.filter((r) => r.expiry_date && String(r.expiry_date) >= today);

  const doc = new jsPDF({ orientation: "landscape" });
  const startY = drawInstitutionalReportHeader(doc, {
    title: "Certificados de peso padrão — vigentes",
    subtitle: `Ambiente: ${tenantName || "—"}  |  Emissão: ${fmtDmyShort(today)}`,
  });
  const body = valid.map((r) => [
    r.set_name || "",
    r.class || "",
    String(r.quantity ?? ""),
    r.manufacturer || "",
    r.model_type || "",
    r.certificate_number || "",
    fmtDmyShort(r.calibration_date),
    r.intermediate_check_label || "",
    fmtDmyShort(r.expiry_date),
    r.calibrated_by || "",
  ]);
  autoTable(doc, {
    startY: startY + 4,
    margin: { left: ML },
    head: [[
      "Conjunto", "Classe", "Qtd", "Fabricante", "Modelo/Tipo", "Nº cert.",
      "Calibração", "Checagem", "Vencimento", "Calibrado por",
    ]],
    body,
    styles: TABLE_STYLES,
    headStyles: { fillColor: FORM_COLORS.tableHeader, textColor: TEXT, fontStyle: "bold" },
  });
  drawInstitutionalPageFooters(doc);
  doc.save(`certificados-peso-padrao-vigentes-${today}.pdf`);
}

/**
 * @param {Array<Record<string, unknown>>} rows environment_sensor_certificates
 * @param {string} tenantName
 */
export async function downloadEnvironmentCertificatesValidPdf(rows, tenantName) {
  const today = new Date().toISOString().slice(0, 10);
  const valid = rows.filter((r) => r.expiry_date && String(r.expiry_date) >= today);

  const doc = new jsPDF({ orientation: "landscape" });
  const startY = drawInstitutionalReportHeader(doc, {
    title: "Termo-baro-higrômetro — certificados vigentes",
    subtitle: `Ambiente: ${tenantName || "—"}  |  Emissão: ${fmtDmyShort(today)}`,
  });
  const body = valid.map((r) => [
    r.equipment_name || "",
    r.manufacturer || "",
    r.model || "",
    r.certificate_number || "",
    fmtDmyShort(r.calibration_date),
    r.intermediate_check_label || "",
    fmtDmyShort(r.expiry_date),
    r.calibrated_by || "",
  ]);
  autoTable(doc, {
    startY: startY + 4,
    margin: { left: ML },
    head: [[
      "Equipamento", "Fabricante", "Modelo", "Nº cert.", "Calibração", "Checagem", "Vencimento", "Calibrado por",
    ]],
    body,
    styles: { ...TABLE_STYLES, fontSize: 8 },
    headStyles: { fillColor: FORM_COLORS.tableHeader, textColor: TEXT, fontStyle: "bold" },
  });
  drawInstitutionalPageFooters(doc);
  doc.save(`certificados-termo-baro-vigentes-${today}.pdf`);
}
