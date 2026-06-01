/**
 * Export PDF/DOCX no cliente (documentos Supabase).
 */

import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  HeadingLevel,
} from "docx";

function stripHtml(html) {
  const div = document.createElement("div");
  div.innerHTML = html || "";
  return (div.textContent || "").trim();
}

function hasEditableHtml(doc) {
  return stripHtml(doc?.content_html).length > 0
    || /<img|<table/i.test(doc?.content_html || "");
}

function buildExportHtmlBody(doc, { pdfHeaderDisclaimer = false } = {}) {
  const body = doc.content_html || "<p></p>";
  const disclaimer = pdfHeaderDisclaimer
    ? `<p style="margin:0 0 12pt;padding:8pt;background:#fff7ed;border:1px solid #fdba74;color:#9a3412;font-size:10pt">
        Nota: esta exportação PDF não inclui o cabeçalho nem o rodapé do ficheiro Word original.
        Abra o documento no editor e use o botão PDF (impressão), ou exporte o ficheiro .docx.
      </p>`
    : "";
  return `
    ${disclaimer}
    <h1 style="font-size:18pt;font-weight:bold;margin:0 0 8pt">${escapeHtml(doc.title || "Documento")}</h1>
    <p style="margin:0 0 16pt;color:#555">Rev. ${escapeHtml(doc.version || "—")} · Emissão: ${escapeHtml(doc.code || "—")}</p>
    <div class="export-body">${body}</div>
  `;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function textRunsFromNode(node, inherited = {}) {
  if (node.nodeType === Node.TEXT_NODE) {
    const t = node.textContent;
    if (!t) return [];
    return [
      new TextRun({
        text: t,
        bold: inherited.bold,
        italics: inherited.italics,
        underline: inherited.underline ? {} : undefined,
      }),
    ];
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return [];
  const tag = node.tagName?.toLowerCase();
  const next = { ...inherited };
  if (tag === "strong" || tag === "b") next.bold = true;
  if (tag === "em" || tag === "i") next.italics = true;
  if (tag === "u") next.underline = true;
  if (tag === "br") return [new TextRun({ break: 1 })];
  const runs = [];
  node.childNodes.forEach((c) => {
    runs.push(...textRunsFromNode(c, next));
  });
  return runs;
}

function paragraphFromElement(el) {
  const runs = textRunsFromNode(el);
  const children = runs.length ? runs : [new TextRun("")];
  const tag = el.tagName?.toLowerCase();
  if (tag === "h1") return new Paragraph({ heading: HeadingLevel.HEADING_1, children });
  if (tag === "h2") return new Paragraph({ heading: HeadingLevel.HEADING_2, children });
  if (tag === "h3") return new Paragraph({ heading: HeadingLevel.HEADING_3, children });
  if (tag === "blockquote") {
    return new Paragraph({ children, indent: { left: 720 } });
  }
  return new Paragraph({ children });
}

function tableFromElement(tableEl) {
  const rows = [];
  tableEl.querySelectorAll("tr").forEach((tr) => {
    const cells = [];
    tr.querySelectorAll("th, td").forEach((cell) => {
      const runs = textRunsFromNode(cell);
      cells.push(
        new TableCell({
          children: [new Paragraph({ children: runs.length ? runs : [new TextRun("")] })],
        }),
      );
    });
    if (cells.length) rows.push(new TableRow({ children: cells }));
  });
  if (!rows.length) return null;
  return new Table({
    rows,
    width: { size: 100, type: WidthType.PERCENTAGE },
  });
}

/** Converte HTML do editor em blocos docx (parágrafos, tabelas). */
function htmlToDocxBlocks(html) {
  const div = document.createElement("div");
  div.innerHTML = html || "";
  const blocks = [];

  const processElement = (el) => {
    const tag = el.tagName?.toLowerCase();
    if (tag === "table") {
      const t = tableFromElement(el);
      if (t) blocks.push(t);
      return;
    }
    if (tag === "ul" || tag === "ol") {
      el.querySelectorAll(":scope > li").forEach((li) => {
        blocks.push(paragraphFromElement(li));
      });
      return;
    }
    if (tag === "img") {
      blocks.push(new Paragraph({
        children: [new TextRun({ text: `[Imagem: ${el.getAttribute("alt") || "anexo"}]`, italics: true })],
      }));
      return;
    }
    if (["p", "h1", "h2", "h3", "div", "blockquote"].includes(tag)) {
      blocks.push(paragraphFromElement(el));
      return;
    }
    el.childNodes.forEach((child) => {
      if (child.nodeType === Node.ELEMENT_NODE) processElement(child);
    });
  };

  div.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const t = node.textContent?.trim();
      if (t) blocks.push(new Paragraph({ children: [new TextRun(t)] }));
      return;
    }
    if (node.nodeType === Node.ELEMENT_NODE) processElement(node);
  });

  return blocks.length ? blocks : [new Paragraph({ children: [new TextRun("")] })];
}

export async function exportDocumentPdf(doc, options = {}) {
  const wrap = document.createElement("div");
  wrap.style.cssText = "position:fixed;left:-9999px;top:0;width:794px;padding:40px;background:#fff;font-family:Arial,sans-serif;font-size:12px;color:#111;";
  wrap.innerHTML = buildExportHtmlBody(doc, options);
  document.body.appendChild(wrap);
  try {
    const canvas = await html2canvas(wrap, { scale: 2, useCORS: true, logging: false });
    const img = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
    const pw = pdf.internal.pageSize.getWidth();
    const ph = pdf.internal.pageSize.getHeight();
    const ratio = Math.min(pw / canvas.width, ph / canvas.height);
    const w = canvas.width * ratio;
    const h = canvas.height * ratio;
    pdf.addImage(img, "PNG", 0, 0, w, h);
    if (h > ph) {
      let left = h - ph;
      let pos = -ph;
      while (left > 0) {
        pdf.addPage();
        pdf.addImage(img, "PNG", 0, pos, w, h);
        left -= ph;
        pos -= ph;
      }
    }
    return pdf.output("blob");
  } finally {
    document.body.removeChild(wrap);
  }
}

async function exportDocxFromHtml(doc) {
  const header = [
    new Paragraph({
      children: [new TextRun({ text: doc.title || "Documento", bold: true, size: 28 })],
    }),
    new Paragraph({
      children: [new TextRun(`Rev. ${doc.version || "—"} · Emissão: ${doc.code || "—"}`)],
    }),
    new Paragraph({ children: [new TextRun("")] }),
  ];
  const body = htmlToDocxBlocks(doc.content_html);
  const docx = new Document({ sections: [{ children: [...header, ...body] }] });
  return Packer.toBlob(docx);
}

export async function exportDocumentDocx(doc) {
  const { isDocxFileName } = await import("@/lib/docxFileUtils");
  if (doc.has_file && isDocxFileName(doc.file_name, doc.file_mime)) {
    const { downloadOriginalFile } = await import("@/lib/documentsApi");
    return downloadOriginalFile(doc);
  }
  if (hasEditableHtml(doc)) {
    try {
      return await exportDocxFromHtml(doc);
    } catch (err) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[documentExport] falhou", err);
      }
    }
  }
  if (doc.has_file && doc.storage_path) {
    const { downloadOriginalFile } = await import("@/lib/documentsApi");
    return downloadOriginalFile(doc);
  }
  return exportDocxFromHtml(doc);
}

export { triggerBlobDownload } from "@/lib/blobDownload";
