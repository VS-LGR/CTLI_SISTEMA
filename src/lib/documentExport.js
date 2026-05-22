/**
 * Export PDF/DOCX no cliente (documentos Supabase).
 */

import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { Document, Packer, Paragraph, TextRun } from "docx";

function stripHtml(html) {
  const div = document.createElement("div");
  div.innerHTML = html || "";
  return div.textContent || "";
}

function htmlToParagraphs(html) {
  const text = stripHtml(html);
  return text.split(/\n+/).filter(Boolean).map(
    (line) => new Paragraph({ children: [new TextRun(line)] }),
  );
}

export async function exportDocumentPdf(doc) {
  const wrap = document.createElement("div");
  wrap.style.cssText = "position:fixed;left:-9999px;top:0;width:794px;padding:40px;background:#fff;font-family:Arial,sans-serif;font-size:12px;color:#111;";
  wrap.innerHTML = `
    <h1 style="font-size:18px;margin:0 0 8px">${doc.title || "Documento"}</h1>
    <p style="margin:0 0 16px;color:#555">Rev. ${doc.version || "—"} · Emissão: ${doc.code || "—"}</p>
    <div>${doc.content_html || "<p></p>"}</div>
  `;
  document.body.appendChild(wrap);
  try {
    const canvas = await html2canvas(wrap, { scale: 2, useCORS: true });
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

export async function exportDocumentDocx(doc) {
  if (doc.has_file && doc.storage_path) {
    const { downloadOriginalFile } = await import("@/lib/documentsApi");
    try {
      return downloadOriginalFile(doc);
    } catch {
      /* fallback to generated docx */
    }
  }
  const paragraphs = [
    new Paragraph({
      children: [new TextRun({ text: doc.title || "Documento", bold: true, size: 28 })],
    }),
    new Paragraph({
      children: [new TextRun(`Rev. ${doc.version || "—"} · Emissão: ${doc.code || "—"}`)],
    }),
    new Paragraph({ children: [new TextRun("")] }),
    ...htmlToParagraphs(doc.content_html),
  ];
  const docx = new Document({ sections: [{ children: paragraphs }] });
  return Packer.toBlob(docx);
}

export function triggerBlobDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
