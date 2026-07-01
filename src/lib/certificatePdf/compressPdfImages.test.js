import {
  pdfImageFormat,
  PDF_PLATFORM_EXPORT_MAX_PX,
  PDF_PLATFORM_EMAIL_MAX_PX,
  PDF_PLATFORM_MIN_PX,
} from "./compressPdfImages";

describe("compressPdfImages", () => {
  test("pdfImageFormat detects JPEG and PNG data URLs", () => {
    expect(pdfImageFormat("data:image/jpeg;base64,abc")).toBe("JPEG");
    expect(pdfImageFormat("data:image/png;base64,abc")).toBe("PNG");
    expect(pdfImageFormat("")).toBe("PNG");
  });

  test("email preset refines export-sized platform images", () => {
    expect(PDF_PLATFORM_EMAIL_MAX_PX).toBeLessThan(PDF_PLATFORM_EXPORT_MAX_PX);
    expect(PDF_PLATFORM_MIN_PX).toBeLessThanOrEqual(PDF_PLATFORM_EXPORT_MAX_PX);
  });
});
