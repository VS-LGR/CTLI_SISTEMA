/** Filtros e status de download para a listagem de coletas */

function norm(s) {
  return String(s ?? "").trim().toLowerCase();
}

/**
 * @param {Array<Record<string, unknown>>} rows
 * @param {{ query?: string, pdfStatus?: string, date?: string }} filters
 */
export function filterColetaRows(rows, { query = "", pdfStatus = "all", date = "" } = {}) {
  const q = norm(query);
  const d = String(date ?? "").trim();

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
    if (pdfStatus === "downloaded" && !row.pdf_downloaded_at) return false;
    if (pdfStatus === "pending" && row.pdf_downloaded_at) return false;
    if (d) {
      const rowDate = row.calibration_date ? String(row.calibration_date).slice(0, 10) : "";
      if (rowDate !== d) return false;
    }
    return true;
  });
}

export function hasActiveColetaFilters(filters) {
  return Boolean(
    filters?.query?.trim()
    || (filters?.pdfStatus && filters.pdfStatus !== "all")
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
 * @param {Array<Record<string, unknown>>} rows
 */
export function coletaKpis(rows) {
  const list = rows || [];
  let pdfDownloaded = 0;
  let tsvDownloaded = 0;
  list.forEach((r) => {
    if (r.pdf_downloaded_at) pdfDownloaded += 1;
    if (r.tsv_downloaded_at) tsvDownloaded += 1;
  });
  return {
    total: list.length,
    pdfDownloaded,
    tsvDownloaded,
    pdfPending: list.length - pdfDownloaded,
  };
}
