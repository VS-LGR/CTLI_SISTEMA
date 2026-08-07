/** Tokens visuais partilhados por todos os PDFs institucionais (A4). */

export const ML = 10;
export const MR = 200;
export const PAGE_W = 210;
export const PAGE_H = 297;
export const TEXT = [30, 30, 30];
export const LOGO_W = 32;
export const LOGO_H = 13;
export const FOOTER_Y = 287;
export const CONTENT_BOTTOM = 275;
export const FOOTER_FONT_SIZE = 7;
/** Margem direita típica em relatórios landscape (mm a partir da borda). */
export const LANDSCAPE_RIGHT = 10;

export const INSTITUTIONAL_PDF_MARGINS = { ML, MR, PAGE_W };

/**
 * Paleta cinza institucional — única fonte para barras, tabelas e bordas.
 * RGB alinhado a certificados / proposta / lista mestra.
 */
export const PDF_GRAY = {
  sectionBar: { rgb: [217, 217, 217], hex: "#D9D9D9" },
  sectionBarText: { rgb: TEXT, hex: "#1E1E1E" },
  fieldLabel: { rgb: [245, 245, 245], hex: "#F5F5F5" },
  tableHeader: { rgb: [240, 240, 240], hex: "#F0F0F0" },
  border: { rgb: [180, 180, 180], hex: "#B4B4B4" },
  accent: { rgb: [120, 120, 120], hex: "#787878" },
  text: { rgb: TEXT, hex: "#1E1E1E" },
  /** Preenchimento suave de secção (equivalente antigo sectionFill). */
  sectionFill: { rgb: [245, 245, 245], hex: "#F5F5F5" },
};

/** Alias flat rgb para drawers jsPDF (setFillColor / headStyles). */
export const FORM_COLORS = {
  sectionBar: PDF_GRAY.sectionBar.rgb,
  sectionBarText: PDF_GRAY.sectionBarText.rgb,
  fieldLabel: PDF_GRAY.fieldLabel.rgb,
  tableHeader: PDF_GRAY.tableHeader.rgb,
  border: PDF_GRAY.border.rgb,
  accent: PDF_GRAY.accent.rgb,
  text: PDF_GRAY.text.rgb,
  sectionFill: PDF_GRAY.sectionFill.rgb,
};

/** Alias legado usado em proposta/pedido/orçamento/pessoal. */
export const HEADER_GRAY = FORM_COLORS.sectionBar;
export const BORDER = FORM_COLORS.border;

export const FONT = {
  docTitle: 12,
  sectionTitle: 9,
  body: 8,
  bodyCompact: 7,
  table: 7,
  tableCompact: 6.5,
  footer: FOOTER_FONT_SIZE,
  meta: 8,
};

export const SPACING = {
  sectionBarH: 5,
  sectionBarHWide: 7,
  sectionGap: 2.5,
  sectionGapWide: 4,
  tableCellPadding: 1.5,
  tableCellPaddingCompact: 0.8,
};
