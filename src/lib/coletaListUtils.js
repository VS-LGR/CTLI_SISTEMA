/** Filtros e status de download para a listagem de coletas */

function norm(s) {
  return String(s ?? "").trim().toLowerCase();
}

/**
 * Ficheiros em falta por coleta (0–2: PDF e/ou TXT).
 * @param {Record<string, unknown>} row
 */
export function coletaPendingFileCount(row) {
  let n = 0;
  if (!row?.pdf_downloaded_at) n += 1;
  if (!row?.tsv_downloaded_at) n += 1;
  return n;
}

/** @param {Record<string, unknown>} row */
export function coletaHasPendingExport(row) {
  return coletaPendingFileCount(row) > 0;
}

/**
 * @param {Record<string, unknown>} row
 * @returns {"complete" | "partial" | "pending"}
 */
export function coletaCombinedExportStatus(row) {
  const pdf = Boolean(row?.pdf_downloaded_at);
  const tsv = Boolean(row?.tsv_downloaded_at);
  if (pdf && tsv) return "complete";
  if (pdf || tsv) return "partial";
  return "pending";
}

/**
 * @param {Array<Record<string, unknown>>} rows
 * @param {{ query?: string, exportStatus?: string, pdfStatus?: string, date?: string }} filters
 */
export function filterColetaRows(
  rows,
  { query = "", exportStatus = "all", pdfStatus = "all", date = "" } = {},
) {
  const q = norm(query);
  const d = String(date ?? "").trim();
  const status = exportStatus !== "all" ? exportStatus : pdfStatus;

  return (rows || []).filter((row) => {
    if (q) {
      const haystack = [
        row.client_name,
        row.scale_serial,
        row.commercial_proposal_ref,
        row.responsible_name,
      ]
        .map(norm)
        .join(" ");
      if (!haystack.includes(q)) return false;
    }
    if (status !== "all") {
      const combined = coletaCombinedExportStatus(row);
      if (status === "downloaded" && combined !== "complete") return false;
      if (status === "pending" && !coletaHasPendingExport(row)) return false;
      if (status === "partial" && combined !== "partial") return false;
    }
    if (d) {
      const rowDate = row.calibration_date ? String(row.calibration_date).slice(0, 10) : "";
      if (rowDate !== d) return false;
    }
    return true;
  });
}

export function hasActiveColetaFilters(filters) {
  const exportStatus = filters?.exportStatus ?? filters?.pdfStatus;
  return Boolean(
    filters?.query?.trim()
    || (exportStatus && exportStatus !== "all")
    || filters?.date?.trim(),
  );
}

/** @param {string | null | undefined} iso */
export function formatDownloadShort(iso) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return null;
  }
}

/**
 * @param {Record<string, unknown>} row
 * @param {"pdf" | "tsv"} kind
 */
export function coletaDownloadStatus(row, kind) {
  const at = kind === "pdf" ? row.pdf_downloaded_at : row.tsv_downloaded_at;
  if (at) {
    return { downloaded: true, at: String(at), labelShort: formatDownloadShort(at) };
  }
  return { downloaded: false, at: null, labelShort: null };
}

/**
 * @param {Record<string, unknown>} row
 */
export function coletaCombinedExportDetail(row) {
  const pdf = coletaDownloadStatus(row, "pdf");
  const tsv = coletaDownloadStatus(row, "tsv");
  const status = coletaCombinedExportStatus(row);
  const parts = [];
  if (pdf.downloaded) parts.push(`PDF: ${pdf.labelShort || "baixado"}`);
  else parts.push("PDF: pendente");
  if (tsv.downloaded) parts.push(`TXT: ${tsv.labelShort || "baixado"}`);
  else parts.push("TXT: pendente");
  return { status, tooltip: parts.join(" · ") };
}

/**
 * @param {Array<Record<string, unknown>>} rows
 */
export function coletaKpis(rows) {
  const list = rows || [];
  let exportComplete = 0;
  let exportPendingFiles = 0;
  list.forEach((r) => {
    if (coletaCombinedExportStatus(r) === "complete") exportComplete += 1;
    exportPendingFiles += coletaPendingFileCount(r);
  });
  return {
    total: list.length,
    exportComplete,
    exportPendingFiles,
    exportPartial: list.filter((r) => coletaCombinedExportStatus(r) === "partial").length,
  };
}
