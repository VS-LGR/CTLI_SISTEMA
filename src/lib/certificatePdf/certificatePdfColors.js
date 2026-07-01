import { TEXT as INSTITUTIONAL_TEXT } from "@/lib/institutionalPdf/theme";

/** Paleta cinza alinhada a pedido de compra, proposta e lista mestra. */
export const CERTIFICATE_PDF_GRAY = {
  sectionBar: { rgb: [217, 217, 217] },
  sectionBarText: { rgb: INSTITUTIONAL_TEXT },
  fieldLabel: { rgb: [245, 245, 245] },
  tableHeader: { rgb: [240, 240, 240] },
  border: { rgb: [180, 180, 180] },
  accent: { rgb: [120, 120, 120] },
  text: { rgb: INSTITUTIONAL_TEXT },
};

export const FORM_COLORS = {
  sectionBar: CERTIFICATE_PDF_GRAY.sectionBar.rgb,
  sectionBarText: CERTIFICATE_PDF_GRAY.sectionBarText.rgb,
  fieldLabel: CERTIFICATE_PDF_GRAY.fieldLabel.rgb,
  tableHeader: CERTIFICATE_PDF_GRAY.tableHeader.rgb,
  border: CERTIFICATE_PDF_GRAY.border.rgb,
  accent: CERTIFICATE_PDF_GRAY.accent.rgb,
  text: CERTIFICATE_PDF_GRAY.text.rgb,
};
