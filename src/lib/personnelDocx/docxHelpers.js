import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  HeadingLevel,
  Footer,
  PageNumber,
  BorderStyle,
} from "docx";
import { displayValue, formatDateBr } from "@/lib/quotationRequestDisplay";
import { triggerBlobDownload } from "@/lib/personnelExportFilename";

const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };

export function buildHeaderParagraphs(header) {
  const emission = formatDateBr(header.modelIssueDate);
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: displayValue(header.title), bold: true, size: 24 })],
    }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { after: 200 },
      children: [
        new TextRun({ text: `Cód.: ${displayValue(header.code)}`, size: 18 }),
        new TextRun({ text: `   Ref.: ${displayValue(header.reference)}`, size: 18 }),
        new TextRun({ text: `   Rev.: ${displayValue(header.revision)}`, size: 18 }),
        new TextRun({ text: `   Emissão: ${emission}`, size: 18 }),
      ],
    }),
  ];
}

export function buildPageFooter() {
  return new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [
          new TextRun({ text: "N.PÁG.: ", size: 16 }),
          new TextRun({ children: [PageNumber.CURRENT], size: 16 }),
          new TextRun({ text: " / ", size: 16 }),
          new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16 }),
        ],
      }),
    ],
  });
}

export function buildKvTable(rows) {
  const list = (rows || []).filter((r) => r && r.length >= 2);
  if (!list.length) return [];
  return [
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: list.map(([label, value]) => new TableRow({
        children: [
          new TableCell({
            width: { size: 35, type: WidthType.PERCENTAGE },
            borders: { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER },
            children: [new Paragraph({ children: [new TextRun({ text: String(label), bold: true, size: 20 })] })],
          }),
          new TableCell({
            width: { size: 65, type: WidthType.PERCENTAGE },
            borders: { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER },
            children: [new Paragraph({ children: [new TextRun({ text: displayValue(value), size: 20 })] })],
          }),
        ],
      })),
    }),
    new Paragraph({ spacing: { after: 120 } }),
  ];
}

export function buildSectionTitle(title) {
  if (!title) return [];
  return [
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 160, after: 80 },
      children: [new TextRun({ text: title, bold: true, size: 22 })],
    }),
  ];
}

export function buildTextBlock(content) {
  const text = displayValue(content);
  if (!text || text === "—") return [];
  return [
    new Paragraph({
      spacing: { after: 120 },
      children: [new TextRun({ text, size: 20 })],
    }),
  ];
}

export function buildBulletList(items) {
  const list = (items || []).filter(Boolean);
  if (!list.length) {
    return [new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: "—", size: 20 })] })];
  }
  return list.map((item) => new Paragraph({
    spacing: { after: 40 },
    children: [new TextRun({ text: `• ${displayValue(item)}`, size: 20 })],
  }));
}

export function buildListSection(title, items) {
  return [
    ...buildSectionTitle(title),
    ...buildBulletList(items),
  ];
}

export function buildSectionsFromModel(sections) {
  const blocks = [];
  for (const sec of sections || []) {
    if (sec.type === "list") {
      blocks.push(...buildListSection(sec.title, sec.items));
    } else {
      blocks.push(...buildSectionTitle(sec.title));
      blocks.push(...buildTextBlock(sec.content));
    }
  }
  return blocks;
}

export async function packAndDownload(children, filename) {
  const doc = new Document({
    sections: [{
      properties: {},
      footers: { default: buildPageFooter() },
      children,
    }],
  });
  const blob = await Packer.toBlob(doc);
  triggerBlobDownload(blob, filename);
}

export function buildDocumentChildren(header, bodyBlocks) {
  return [
    ...buildHeaderParagraphs(header),
    ...bodyBlocks,
  ];
}
