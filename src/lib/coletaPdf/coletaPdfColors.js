/**
 * Paleta azul ProcVault para PDF coleta (espelha Tailwind blue da UI).
 * sectionBar = blue-500; campos = blue-100; tabelas = blue-200.
 */

import { TEXT as INSTITUTIONAL_TEXT } from "@/lib/institutionalPdf/theme";

export const COLETA_PDF_BLUE = {
  brand: { hex: "#2563EB", rgb: [37, 99, 235] },
  sectionBar: { hex: "#3B82F6", rgb: [59, 130, 246] },
  sectionBarText: { hex: "#FFFFFF", rgb: [255, 255, 255] },
  sectionFill: { hex: "#DBEAFE", rgb: [219, 234, 254] },
  tableHeader: { hex: "#BFDBFE", rgb: [191, 219, 254] },
  border: { hex: "#93C5FD", rgb: [147, 197, 253] },
  text: { hex: "#1E1E1E", rgb: INSTITUTIONAL_TEXT },
};
