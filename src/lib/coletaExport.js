import { buildColetaDocumentModel } from "./coletaExportModel";
import { buildColetaVbaLines } from "./coletaVbaMapping";

export { buildColetaDocumentModel };

function fileSlug(row) {
  const serial = row?.scale_serial || "coleta";
  const date = row?.calibration_date || new Date().toISOString().slice(0, 10);
  return `${serial}-${date}`.replace(/[^a-zA-Z0-9_-]/g, "_");
}

/** Carrega jsPDF só ao exportar (evita TDZ no bundle principal). */
export async function exportColetaPdf(
  row,
  tenantName = "",
  { logoDataUrl, envCerts = [], weightItems = [], tenant = null } = {},
) {
  const { renderColetaPdf } = await import(
    /* webpackChunkName: "coleta-pdf" */ "./coletaPdf/renderToPdf"
  );
  await renderColetaPdf(row, tenantName, { logoDataUrl, envCerts, weightItems, tenant });
}

/**
 * Exporta TXT para importação VBA (formato ABA;COLUNA;VALOR por linha).
 */
export function exportColetaTsv(row, { envCerts = [], weightItems = [] } = {}) {
  void weightItems;
  const lines = buildColetaVbaLines(row, { envCerts });
  const bom = "\uFEFF";
  const content = `${bom}${lines.join("\n")}\n`;
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `coleta-${fileSlug(row)}.txt`;
  a.click();
  URL.revokeObjectURL(a.href);
}
