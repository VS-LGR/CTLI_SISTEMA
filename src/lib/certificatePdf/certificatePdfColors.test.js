import { FORM_COLORS, CERTIFICATE_PDF_GRAY } from "./certificatePdfColors";

describe("certificatePdfColors", () => {
  test("uses institutional gray palette", () => {
    expect(FORM_COLORS.sectionBar).toEqual([217, 217, 217]);
    expect(FORM_COLORS.border).toEqual([180, 180, 180]);
    expect(FORM_COLORS.fieldLabel).toEqual([245, 245, 245]);
    expect(FORM_COLORS.accent).toEqual([120, 120, 120]);
    expect(FORM_COLORS.text).toEqual(CERTIFICATE_PDF_GRAY.text.rgb);
  });
});
