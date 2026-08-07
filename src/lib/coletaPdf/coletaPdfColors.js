/**
 * Cores do PDF de coleta — mesma paleta cinza institucional dos certificados.
 * COLETA_PDF_BLUE mantém-se como alias deprecated → cinza (compatibilidade).
 */
import { PDF_GRAY, FORM_COLORS as INSTITUTIONAL_FORM_COLORS, TEXT } from "@/lib/institutionalPdf/theme";

export const COLETA_PDF_GRAY = PDF_GRAY;

/** @deprecated Use COLETA_PDF_GRAY / institutional FORM_COLORS — já é cinza. */
export const COLETA_PDF_BLUE = {
  brand: { hex: PDF_GRAY.accent.hex, rgb: PDF_GRAY.accent.rgb },
  sectionBar: { hex: PDF_GRAY.sectionBar.hex, rgb: PDF_GRAY.sectionBar.rgb },
  sectionBarText: { hex: PDF_GRAY.sectionBarText.hex, rgb: PDF_GRAY.sectionBarText.rgb },
  sectionFill: { hex: PDF_GRAY.sectionFill.hex, rgb: PDF_GRAY.sectionFill.rgb },
  tableHeader: { hex: PDF_GRAY.tableHeader.hex, rgb: PDF_GRAY.tableHeader.rgb },
  border: { hex: PDF_GRAY.border.hex, rgb: PDF_GRAY.border.rgb },
  text: { hex: PDF_GRAY.text.hex, rgb: TEXT },
};

export const FORM_COLORS = {
  ...INSTITUTIONAL_FORM_COLORS,
  sectionGreen: INSTITUTIONAL_FORM_COLORS.sectionFill,
  tableHeaderGreen: INSTITUTIONAL_FORM_COLORS.tableHeader,
  fieldLabelGreen: INSTITUTIONAL_FORM_COLORS.fieldLabel,
  brand: INSTITUTIONAL_FORM_COLORS.accent,
};
