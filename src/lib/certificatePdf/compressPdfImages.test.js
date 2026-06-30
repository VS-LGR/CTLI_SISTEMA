import { pdfImageFormat } from "./compressPdfImages";

describe("compressPdfImages", () => {
  test("pdfImageFormat detects JPEG and PNG data URLs", () => {
    expect(pdfImageFormat("data:image/jpeg;base64,abc")).toBe("JPEG");
    expect(pdfImageFormat("data:image/png;base64,abc")).toBe("PNG");
    expect(pdfImageFormat("")).toBe("PNG");
  });
});
