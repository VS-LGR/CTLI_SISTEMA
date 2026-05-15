import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

function fmtDmy(isoDate) {
  if (!isoDate) return "—";
  const [y, m, d] = String(isoDate).split("-");
  if (!y || !m || !d) return isoDate;
  return `${d}/${m}/${y}`;
}

/**
 * @param {Array<Record<string, unknown>>} rows weight_standard_certificates
 * @param {string} tenantName
 */
export function downloadWeightCertificatesValidPdf(rows, tenantName) {
  const today = new Date().toISOString().slice(0, 10);
  const valid = rows.filter((r) => r.expiry_date && String(r.expiry_date) >= today);
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(14);
  doc.text("Certificados de peso padrão — dentro da validade", 14, 16);
  doc.setFontSize(10);
  doc.text(`Ambiente: ${tenantName || "—"}  |  Emissão: ${fmtDmy(today)}`, 14, 24);
  const body = valid.map((r) => [
    r.set_name || "",
    r.class || "",
    String(r.quantity ?? ""),
    r.manufacturer || "",
    r.model_type || "",
    r.certificate_number || "",
    fmtDmy(r.calibration_date),
    r.intermediate_check_label || "",
    fmtDmy(r.expiry_date),
    r.calibrated_by || "",
  ]);
  autoTable(doc, {
    startY: 30,
    head: [[
      "Conjunto", "Classe", "Qtd", "Fabricante", "Modelo/Tipo", "Nº cert.",
      "Calibração", "Checagem", "Vencimento", "Calibrado por",
    ]],
    body,
    styles: { fontSize: 7 },
    headStyles: { fillColor: [37, 99, 235] },
  });
  doc.save(`relatorio-peso-padrao-validos-${today}.pdf`);
}

/**
 * @param {Array<Record<string, unknown>>} rows environment_sensor_certificates
 * @param {string} tenantName
 */
export function downloadEnvironmentCertificatesValidPdf(rows, tenantName) {
  const today = new Date().toISOString().slice(0, 10);
  const valid = rows.filter((r) => r.expiry_date && String(r.expiry_date) >= today);
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(14);
  doc.text("Thermo-baro-higrômetro — dentro da validade", 14, 16);
  doc.setFontSize(10);
  doc.text(`Ambiente: ${tenantName || "—"}  |  Emissão: ${fmtDmy(today)}`, 14, 24);
  const body = valid.map((r) => [
    r.equipment_name || "",
    r.manufacturer || "",
    r.model || "",
    r.certificate_number || "",
    fmtDmy(r.calibration_date),
    r.intermediate_check_label || "",
    fmtDmy(r.expiry_date),
    r.calibrated_by || "",
  ]);
  autoTable(doc, {
    startY: 30,
    head: [[
      "Equipamento", "Fabricante", "Modelo", "Nº cert.", "Calibração", "Checagem", "Vencimento", "Calibrado por",
    ]],
    body,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [37, 99, 235] },
  });
  doc.save(`relatorio-thermo-baro-validos-${today}.pdf`);
}
