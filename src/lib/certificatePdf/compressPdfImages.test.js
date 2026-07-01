import {
  pdfImageFormat,
  PDF_PLATFORM_IMAGE_MAX_PX,
  EMAIL_PLATFORM_IMAGE_MAX_PX,
} from "./compressPdfImages";

describe("compressPdfImages", () => {
  test("pdfImageFormat detects JPEG and PNG data URLs", () => {
    expect(pdfImageFormat("data:image/jpeg;base64,abc")).toBe("JPEG");
    expect(pdfImageFormat("data:image/png;base64,abc")).toBe("PNG");
    expect(pdfImageFormat("")).toBe("PNG");
  });

  test("email compression refines already downscaled platform images", () => {
    expect(EMAIL_PLATFORM_IMAGE_MAX_PX).toBeLessThan(PDF_PLATFORM_IMAGE_MAX_PX);
  });
});
