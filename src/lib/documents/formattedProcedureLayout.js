import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { drawInstitutionalPdfHeader } from "@/lib/institutionalPdf/drawHeader";
import { fitLogoInBox } from "@/lib/institutionalPdf/htmlFormChrome";
import { drawInstitutionalPageFooters } from "@/lib/institutionalPdf/drawPageFooters";
import {
  BORDER,
  FONT,
  FORM_COLORS,
  LOGO_W,
  LOGO_H,
  ML,
  MR,
  PAGE_H,
  PAGE_W,
  TEXT,
} from "@/lib/institutionalPdf/theme";
import { formatDateBr } from "@/lib/quotationRequestDisplay";

const BODY_TOP = 28;
const BODY_BOTTOM = PAGE_H - 16;

function paintBodyHeader(doc, logoDataUrl, title) {
  if (logoDataUrl) {
    try {
      const box = fitLogoInBox(logoDataUrl, LOGO_W, LOGO_H, doc);
      doc.addImage(logoDataUrl, "PNG", ML, 8, box.w, box.h);
    } catch { /* logo opcional */ }
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(FONT.docTitle);
  doc.setTextColor(...TEXT);
  doc.text(title || "Documento", PAGE_W / 2, 16, { align: "center", maxWidth: 120 });
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.2);
  doc.line(ML, 24, MR, 24);
}

function sectionBar(doc, y, title) {
  doc.setFillColor(...FORM_COLORS.sectionBar);
  doc.rect(ML, y, MR - ML, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(FONT.sectionTitle);
  doc.setTextColor(...TEXT);
  doc.text(title, ML + 2, y + 4.8);
  return y + 10;
}

function drawTable(doc, { startY, head, body, logoDataUrl, title, onContinuation }) {
  autoTable(doc, {
    startY,
    margin: { top: BODY_TOP, bottom: 16, left: ML, right: PAGE_W - MR },
    head: head ? [head] : undefined,
    body: body.length ? body : [[""]],
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: FONT.body,
      cellPadding: 1.8,
      textColor: TEXT,
      lineColor: BORDER,
      lineWidth: 0.15,
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: FORM_COLORS.tableHeader,
      textColor: TEXT,
      fontStyle: "bold",
      fontSize: FONT.body,
    },
    alternateRowStyles: { fillColor: FORM_COLORS.sectionFill },
    didDrawPage: (data) => {
      if (data.pageNumber > 1) {
        paintBodyHeader(doc, logoDataUrl, title);
        onContinuation?.();
      }
    },
  });
  return (doc.lastAutoTable?.finalY || startY) + 4;
}

/**
 * Desenha o PDF de leitura. Não altera o registo nem o ficheiro Word.
 */
export function renderFormattedProcedurePdf({
  identity,
  isProcedure = false,
  distributions = [],
  revisions = [],
  signatures = [],
  blocks = [],
  logoDataUrl = null,
}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const title = identity?.title || "Documento";
  let y = drawInstitutionalPdfHeader(doc, {
    title,
    code: identity?.code,
    reference: isProcedure ? "Procedimento" : "Registo",
    revision: identity?.revision,
    modelIssueDate: identity?.emissionIso,
  }, logoDataUrl);
  y += 3;

  y = drawTable(doc, {
    startY: y,
    body: [
      ["Responsável", identity?.responsible || "—"],
      ["Próxima revisão", identity?.nextReview || "—"],
    ],
    logoDataUrl,
    title,
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(FONT.bodyCompact);
  doc.setTextColor(...FORM_COLORS.accent);
  const note = doc.splitTextToSize(
    "Folha de controlo composta na descarga. O Word original e os campos do editor continuam editáveis.",
    MR - ML,
  );
  doc.text(note, ML, y);
  y += note.length * 3.6 + 3;
  doc.setTextColor(...TEXT);

  const writeLines = (heading, lines) => {
    if (y > BODY_BOTTOM - 20) {
      doc.addPage();
      y = 16;
    }
    y = sectionBar(doc, y, heading);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(FONT.body);
    lines.forEach((line) => {
      const wrapped = doc.splitTextToSize(line, MR - ML);
      if (y + wrapped.length * 4 > BODY_BOTTOM) {
        doc.addPage();
        y = 16;
      }
      doc.text(wrapped, ML, y);
      y += wrapped.length * 4.2 + 1;
    });
    y += 2;
  };

  if (isProcedure) {
    if (distributions.length) {
      if (y > BODY_BOTTOM - 24) {
        doc.addPage();
        y = 16;
      }
      y = sectionBar(doc, y, "Lista de distribuição");
      y = drawTable(doc, {
        startY: y,
        head: ["Área", "Tipo de cópia", "Data"],
        body: distributions.map((row) => [
          row.area || "—",
          row.copy_type || "—",
          formatDateBr(row.distribution_date) === "-" ? "—" : formatDateBr(row.distribution_date),
        ]),
        logoDataUrl,
        title,
      });
    } else {
      writeLines("Lista de distribuição", ["Sem distribuição registada na lista mestra."]);
    }

    if (revisions.length) {
      if (y > BODY_BOTTOM - 24) {
        doc.addPage();
        y = 16;
      }
      y = sectionBar(doc, y, "Histórico de revisão");
      y = drawTable(doc, {
        startY: y,
        head: ["Revisão", "Descrição", "Data"],
        body: revisions.map((row) => [
          row.revision_number || "—",
          row.change_description || row.notes || "—",
          formatDateBr(row.revision_date || row.approved_at) === "-"
            ? "—"
            : formatDateBr(row.revision_date || row.approved_at),
        ]),
        logoDataUrl,
        title,
      });
    } else {
      writeLines("Histórico de revisão", ["Sem revisões registadas na lista mestra."]);
    }
  }

  if (signatures.length) {
    if (y > BODY_BOTTOM - 24) {
      doc.addPage();
      y = 16;
    }
    y = sectionBar(doc, y, "Assinaturas");
    y = drawTable(doc, {
      startY: y,
      head: ["Assinatura", "Responsável", "Revisão"],
      body: signatures.map((row) => [row.title || "Assinatura", row.responsible || "—", row.version || "—"]),
      logoDataUrl,
      title,
    });
  } else {
    writeLines("Assinaturas", ["Sem assinaturas registadas."]);
  }

  const content = blocks.length ? blocks : [{ type: "paragraph", text: "O ficheiro Word não tem texto no corpo." }];
  let cursor = BODY_TOP;
  const openBody = () => {
    doc.addPage();
    paintBodyHeader(doc, logoDataUrl, title);
    cursor = BODY_TOP;
  };
  openBody();

  const ensure = (needed) => {
    if (cursor + needed <= BODY_BOTTOM) return;
    openBody();
  };

  content.forEach((block) => {
    if (block.type === "heading") {
      const size = block.level <= 1 ? 13 : block.level === 2 ? 11 : 10;
      ensure(10);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(size);
      doc.setTextColor(...TEXT);
      const lines = doc.splitTextToSize(block.text, MR - ML);
      doc.text(lines, ML, cursor);
      cursor += lines.length * (size > 11 ? 6 : 5) + 2;
      return;
    }

    if (block.type === "paragraph") {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(FONT.sectionTitle);
      doc.setTextColor(...TEXT);
      const lines = doc.splitTextToSize(block.text, MR - ML);
      lines.forEach((line) => {
        ensure(5);
        doc.text(line, ML, cursor);
        cursor += 4.4;
      });
      cursor += 1.6;
      return;
    }

    if (block.type === "list") {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(FONT.sectionTitle);
      doc.setTextColor(...TEXT);
      block.items.forEach((item, index) => {
        const prefix = block.ordered ? `${index + 1}. ` : "• ";
        const lines = doc.splitTextToSize(`${prefix}${item}`, MR - ML - 2);
        lines.forEach((line) => {
          ensure(5);
          doc.text(line, ML + 1, cursor);
          cursor += 4.4;
        });
      });
      cursor += 1.6;
      return;
    }

    if (block.type === "table") {
      const rows = block.rows || [];
      const head = block.header ? rows[0] : null;
      const body = block.header ? rows.slice(1) : rows;
      if (cursor > BODY_BOTTOM - 20) openBody();
      cursor = drawTable(doc, {
        startY: cursor,
        head,
        body,
        logoDataUrl,
        title,
      });
      return;
    }

    if (block.type === "image" && block.src) {
      try {
        const props = doc.getImageProperties(block.src);
        const maxW = MR - ML;
        const maxH = 75;
        let w = maxW;
        let h = props.width ? (props.height / props.width) * w : maxH;
        if (h > maxH) {
          h = maxH;
          w = props.height ? (props.width / props.height) * h : maxW;
        }
        ensure(h + 4);
        const format = /jpe?g/i.test(block.src.slice(0, 30)) ? "JPEG" : "PNG";
        doc.addImage(block.src, format, ML, cursor, w, h);
        cursor += h + 4;
      } catch {
        ensure(6);
        doc.setFont("helvetica", "italic");
        doc.setFontSize(FONT.body);
        doc.text("Imagem do documento não pôde ser desenhada.", ML, cursor);
        cursor += 6;
      }
    }
  });

  drawInstitutionalPageFooters(doc);
  doc.setPage(doc.getNumberOfPages());
  return doc;
}
