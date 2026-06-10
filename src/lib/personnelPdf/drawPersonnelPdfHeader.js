import { drawInstitutionalPdfHeader } from "@/lib/institutionalPdf/drawHeader";
import { drawInstitutionalPageFooters } from "@/lib/institutionalPdf/drawPageFooters";
import { ensureInstitutionalSpace } from "@/lib/institutionalPdf/ensureSpace";
import { INSTITUTIONAL_PDF_MARGINS } from "@/lib/institutionalPdf/theme";

export const PERSONNEL_PDF_MARGINS = INSTITUTIONAL_PDF_MARGINS;

export function drawPersonnelPdfHeader(doc, header, logoDataUrl, yStart = 8) {
  return drawInstitutionalPdfHeader(doc, header, logoDataUrl, yStart);
}

export function drawPersonnelPageFooters(doc) {
  return drawInstitutionalPageFooters(doc);
}

export function ensurePersonnelSpace(doc, y, needed, redrawHeader, header, logoDataUrl) {
  return ensureInstitutionalSpace(doc, y, needed, () => redrawHeader(doc, header, logoDataUrl, 8));
}
