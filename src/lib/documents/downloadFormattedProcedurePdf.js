import { jsPDF } from "jspdf";
import { supabase } from "@/lib/supabaseClient";
import { docxBlobToHtml } from "@/lib/docxImport";
import { loadTenantLogoDataUrl } from "@/lib/tenantBranding";
import { findMasterDocumentByCode, listDocumentRevisions, listDocumentDistributions } from "@/lib/masterDocuments/masterDocumentsApi";
import { ML, MR, PAGE_H, PAGE_W, TEXT } from "@/lib/institutionalPdf/theme";
import { formatDateBr } from "@/lib/quotationRequestDisplay";

function htmlToParagraphs(html) {
  const text = String(html || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|h1|h2|h3|li|tr)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
  return text.split(/\n/).map((line) => line.replace(/\s+/g, " ").trim()).filter(Boolean);
}

function masterLookupCode(docRecord) {
  const code = String(docRecord?.code || "").trim();
  if (code && !/^\d{4}-\d{2}-\d{2}$/.test(code)) return code;
  const title = String(docRecord?.title || "");
  const match = title.match(/\b((?:PR|RE|FOR|IT|MQ)[-\s]?\d[\d.]*)\b/i);
  return match ? match[1].replace(/\s+/g, "-").toUpperCase() : "";
}

function drawBodyHeader(doc, { logoDataUrl, title, page, pages }) {
  if (logoDataUrl) {
    try { doc.addImage(logoDataUrl, "PNG", ML, 8, 28, 12); } catch { /* logo opcional */ }
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...TEXT);
  doc.text(title || "Procedimento", PAGE_W / 2, 15, { align: "center", maxWidth: 110 });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`${page} / ${pages}`, MR, 15, { align: "right" });
  doc.setDrawColor(180, 180, 180);
  doc.line(ML, 24, MR, 24);
  return 30;
}

/**
 * PDF formatado: folha de controlo + corpo sem a caixa de código do Word.
 * Não altera o ficheiro guardado.
 */
export async function downloadFormattedProcedurePdf(docRecord, { mode = "download" } = {}) {
  const isProcedure = docRecord?.section === "procedimento";
  const tenantId = docRecord?.tenant_id;
  let logoDataUrl = null;
  let distributions = [];
  let revisions = [];
  let signatures = [];

  if (tenantId) {
    const { data: tenant } = await supabase
      .from("tenants")
      .select("id, logo_storage_path, name")
      .eq("id", tenantId)
      .maybeSingle();
    logoDataUrl = await loadTenantLogoDataUrl(tenant);
    const lookupCode = masterLookupCode(docRecord);
    if (isProcedure && lookupCode) {
      const master = await findMasterDocumentByCode(tenantId, lookupCode).catch(() => null);
      if (master?.id) {
        distributions = await listDocumentDistributions(tenantId, master.id).catch(() => []);
        revisions = await listDocumentRevisions(tenantId, master.id).catch(() => []);
      }
    }
    const { data: signs } = await supabase
      .from("tenant_documents")
      .select("title, responsible, version")
      .eq("tenant_id", tenantId)
      .eq("section", "assinatura")
      .order("title");
    signatures = signs || [];
  }

  let paragraphs = [];
  if (docRecord?.has_file) {
    const { downloadOriginalFile } = await import("@/lib/documentsApi");
    const blob = await downloadOriginalFile(docRecord);
    const html = await docxBlobToHtml(blob);
    paragraphs = htmlToParagraphs(html);
  } else if (docRecord?.content_html) {
    paragraphs = htmlToParagraphs(docRecord.content_html);
  }

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const title = docRecord?.title || "Documento";
  let y = 16;
  let coverPages = 1;
  const ensureCover = (needed = 8) => {
    if (y + needed <= PAGE_H - 16) return;
    doc.addPage();
    coverPages += 1;
    y = 16;
  };
  if (logoDataUrl) {
    try { doc.addImage(logoDataUrl, "PNG", ML, 12, 32, 13); } catch { /* opcional */ }
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...TEXT);
  const titleLines = doc.splitTextToSize(title, MR - ML);
  doc.text(titleLines, ML, 36);
  y = 40 + titleLines.length * 6;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const codeLooksLikeDate = /^\d{4}-\d{2}-\d{2}$/.test(String(docRecord?.code || ""));
  const control = [
    ["Código", codeLooksLikeDate ? (docRecord?.title || "—") : (docRecord?.code || docRecord?.title || "—")],
    ["Revisão", docRecord?.version || "—"],
    ["Emissão", codeLooksLikeDate ? (formatDateBr(docRecord.code) || docRecord.code) : "—"],
    ["Responsável", docRecord?.responsible || "—"],
    ["Próxima revisão", formatDateBr(docRecord?.review_date) || docRecord?.review_date || "—"],
  ];
  control.forEach(([label, value]) => {
    ensureCover(8);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(`${label}:`, ML, y);
    doc.setFont("helvetica", "normal");
    const valueLines = doc.splitTextToSize(String(value), MR - ML - 42);
    doc.text(valueLines, ML + 40, y);
    y += Math.max(6, valueLines.length * 5);
  });
  y += 4;

  const writeBlock = (heading, lines) => {
    ensureCover(14);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(heading, ML, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    lines.forEach((line) => {
      const wrapped = doc.splitTextToSize(line, MR - ML);
      ensureCover(wrapped.length * 4 + 2);
      doc.text(wrapped, ML, y);
      y += wrapped.length * 4 + 1;
    });
    y += 3;
  };

  if (isProcedure) {
    writeBlock(
      "Lista de distribuição",
      distributions.length
        ? distributions.map((row) => `${row.area || "—"} · ${row.copy_type || ""} · ${formatDateBr(row.distribution_date) || ""}`.trim())
        : ["Sem distribuição registada na lista mestra."],
    );
    writeBlock(
      "Histórico de revisão",
      revisions.length
        ? revisions.map((row) => `Rev. ${row.revision_number || "—"} — ${row.change_description || row.notes || ""}`)
        : ["Sem revisões registadas na lista mestra."],
    );
  }
  writeBlock(
    "Assinaturas",
    signatures.length
      ? signatures.map((row) => `${row.title || "Assinatura"} — ${row.responsible || "—"}`)
      : ["Sem assinaturas registadas."],
  );

  const bodyLines = [];
  paragraphs.forEach((paragraph) => {
    const wrapped = doc.splitTextToSize(paragraph, MR - ML);
    wrapped.forEach((line) => bodyLines.push(line));
    bodyLines.push("");
  });
  if (!bodyLines.length) bodyLines.push("O ficheiro Word não tem texto no corpo.");

  const lineH = 4.2;
  const firstBodyTop = 30;
  const bottom = PAGE_H - 16;
  const perPage = Math.floor((bottom - firstBodyTop) / lineH);
  const pageCount = Math.max(1, Math.ceil(bodyLines.length / perPage));

  for (let page = 1; page <= pageCount; page += 1) {
    doc.addPage();
    let cursor = drawBodyHeader(doc, {
      logoDataUrl,
      title,
      page: page + coverPages,
      pages: pageCount + coverPages,
    });
    const slice = bodyLines.slice((page - 1) * perPage, page * perPage);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    slice.forEach((line) => {
      doc.text(line || " ", ML, cursor);
      cursor += lineH;
    });
  }

  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= coverPages; page += 1) {
    doc.setPage(page);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...TEXT);
    doc.text(`${page} / ${totalPages}`, MR, 12, { align: "right" });
  }

  const safeName = String(title).replace(/[^\w\- ]+/g, "").trim() || "documento";
  if (mode === "print") {
    doc.autoPrint();
    const url = doc.output("bloburl");
    const opened = window.open(url, "_blank", "noopener,noreferrer");
    if (!opened) doc.save(`${safeName}-formatado.pdf`);
    return;
  }
  doc.save(`${safeName}-formatado.pdf`);
}
