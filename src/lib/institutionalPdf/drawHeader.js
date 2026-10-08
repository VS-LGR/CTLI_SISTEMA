import { displayValue, formatDateBr } from "@/lib/quotationRequestDisplay";
import { companyFromSources, drawHtmlFormHeader } from "./htmlFormChrome";
import { ML, PAGE_W, TEXT } from "./theme";

/**
 * Cabeçalho institucional padrão (Pessoal 6.2).
 * @param {import("jspdf").jsPDF} doc
 * @param {{ title?: string, code?: string, reference?: string, revision?: string, modelIssueDate?: string }} header
 * @param {string|null|undefined} logoDataUrl
 * @param {number} [yStart=8]
 */
function emissionLabel(value) {
  const raw = String(value || "").trim();
  if (!raw || raw === "-" || raw === "—") return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    const formatted = formatDateBr(raw.slice(0, 10));
    return formatted && formatted !== "-" ? formatted : raw;
  }
  return raw;
}

function currentPage(doc) {
  return doc.internal?.getCurrentPageInfo?.()?.pageNumber || 1;
}

export function drawInstitutionalPdfHeader(doc, header = {}, logoDataUrl, yStart = 8) {
  return drawHtmlFormHeader(doc, {
    logoDataUrl,
    company: header.company || companyFromSources({
      tenant: header.tenant,
      fallbackName: header.issuerName || header.tenantName || "",
    }),
    title: displayValue(header.title) === "—" ? "" : (header.title || ""),
    code: header.code || "",
    reference: header.reference || header.ref || "",
    revision: header.revision || "",
    emission: emissionLabel(header.modelIssueDate || header.emission),
    elaborado: header.elaboratedBy || "",
    verificado: header.verifiedBy || "",
    aprovado: header.approvedBy || "",
    withControl: currentPage(doc) === 1,
    yStart,
  });
}

/**
 * Cabeçalho com linhas centrais extras (Pedido de Compra, Solicitação de Orçamento).
 * @param {import("jspdf").jsPDF} doc
 * @param {string|null|undefined} logoDataUrl
 * @param {number} [yStart=8]
 * @param {{
 *   title: string,
 *   titleFontSize?: number,
 *   centerLines?: Array<{ text: string, bold?: boolean, fontSize?: number, maxWidth?: number }>,
 *   metaLines: string[],
 *   minBottom?: number,
 * }} config
 */
function readMetaLines(lines = []) {
  const out = {};
  lines.forEach((line) => {
    const match = String(line).match(/^(Cód\.|Ref\.|Rev\.|Emissão):\s*(.*)$/);
    if (!match) return;
    const value = match[2].trim();
    if (match[1] === "Cód.") out.code = value;
    if (match[1] === "Ref.") out.reference = value;
    if (match[1] === "Rev.") out.revision = value;
    if (match[1] === "Emissão") out.emission = value === "-" || value === "—" ? "" : value;
  });
  return out;
}

export function drawInstitutionalPdfHeaderWithCenterLines(doc, logoDataUrl, yStart, config) {
  const meta = readMetaLines(config.metaLines);
  let y = drawHtmlFormHeader(doc, {
    logoDataUrl,
    company: config.company,
    title: config.title,
    code: config.code || meta.code || "",
    reference: config.reference || meta.reference || "",
    revision: config.revision || meta.revision || "",
    emission: emissionLabel(config.emission || meta.emission),
    elaborado: config.elaboratedBy || "",
    verificado: config.verifiedBy || "",
    aprovado: config.approvedBy || "",
    withControl: currentPage(doc) === 1,
    yStart,
  });
  doc.setTextColor(...TEXT);
  for (const line of config.centerLines || []) {
    doc.setFont("helvetica", line.bold ? "bold" : "normal");
    doc.setFontSize(line.fontSize ?? 8);
    doc.text(line.text, ML, y + 3.2, { maxWidth: (doc.internal?.pageSize?.getWidth?.() || PAGE_W) - ML - 12 });
    y += (line.fontSize ?? 8) > 8 ? 5 : 4.4;
  }
  return y + 2;
}

/**
 * Cabeçalho simplificado para relatórios (cadastro, documentos).
 * @param {import("jspdf").jsPDF} doc
 * @param {{ title: string, subtitle?: string }} header
 * @param {number} [yStart=14]
 */
export function drawInstitutionalReportHeader(doc, header, yStart = 14) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...TEXT);
  doc.text(header.title, ML, yStart);

  if (header.subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(header.subtitle, ML, yStart + 8);
    return yStart + 16;
  }
  return yStart + 10;
}
