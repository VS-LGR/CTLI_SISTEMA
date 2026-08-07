import { FORM_COLORS, PDF_GRAY, HEADER_GRAY, BORDER, ML, FOOTER_Y } from "./theme";
import { FORM_COLORS as CertForm, CERTIFICATE_PDF_GRAY } from "@/lib/certificatePdf/certificatePdfColors";
import { FORM_COLORS as ColetaForm, COLETA_PDF_GRAY, COLETA_PDF_BLUE } from "@/lib/coletaPdf/coletaPdfColors";
import { equipmentKindPdfFill } from "@/lib/equipmentVerifications/equipmentKindPdfColors";

describe("institutionalPdf theme gray palette", () => {
  test("PDF_GRAY and FORM_COLORS stay in sync", () => {
    expect(FORM_COLORS.sectionBar).toEqual(PDF_GRAY.sectionBar.rgb);
    expect(FORM_COLORS.tableHeader).toEqual([240, 240, 240]);
    expect(HEADER_GRAY).toEqual([217, 217, 217]);
    expect(BORDER).toEqual([180, 180, 180]);
    expect(ML).toBe(10);
    expect(FOOTER_Y).toBe(287);
  });

  test("certificate and coleta colors reexport the same gray", () => {
    expect(CertForm.sectionBar).toEqual(FORM_COLORS.sectionBar);
    expect(ColetaForm.sectionBar).toEqual(FORM_COLORS.sectionBar);
    expect(CERTIFICATE_PDF_GRAY.sectionBar.rgb).toEqual(PDF_GRAY.sectionBar.rgb);
    expect(COLETA_PDF_GRAY.sectionBar.rgb).toEqual(PDF_GRAY.sectionBar.rgb);
    expect(COLETA_PDF_BLUE.sectionBar.rgb).toEqual(PDF_GRAY.sectionBar.rgb);
  });

  test("equipment kind PDF heads use institutional tableHeader gray", () => {
    expect(equipmentKindPdfFill("pesos")).toEqual(FORM_COLORS.tableHeader);
    expect(equipmentKindPdfFill("thermo")).toEqual(FORM_COLORS.tableHeader);
    expect(equipmentKindPdfFill("unknown")).toEqual(FORM_COLORS.tableHeader);
  });
});
