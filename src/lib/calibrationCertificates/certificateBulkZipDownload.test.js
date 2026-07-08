import {
  buildCertificatesZipFileName,
  certificateMatchesClient,
  collectDownloadableCertificateIdsForClient,
  downloadCertificatesZip,
  isZipDownloadableRow,
  sanitizeZipSegment,
} from "./certificateBulkZipDownload";

describe("certificateBulkZipDownload", () => {
  beforeEach(() => {
    global.URL.createObjectURL = jest.fn(() => "blob:mock");
    global.URL.revokeObjectURL = jest.fn();
  });

  test("isZipDownloadableRow aceita status finais", () => {
    expect(isZipDownloadableRow({ status: "aprovado" })).toBe(true);
    expect(isZipDownloadableRow({ status: "emitido" })).toBe(true);
    expect(isZipDownloadableRow({ status: "enviado" })).toBe(true);
    expect(isZipDownloadableRow({ status: "rascunho" })).toBe(false);
  });

  test("sanitizeZipSegment remove acentos e espaços", () => {
    expect(sanitizeZipSegment("Cliente Açúcar Ltda")).toBe("Cliente-Acucar-Ltda");
  });

  test("buildCertificatesZipFileName inclui cliente quando informado", () => {
    const date = new Date(2026, 6, 8);
    expect(buildCertificatesZipFileName({ date })).toBe("certificados-2026-07-08.zip");
    expect(buildCertificatesZipFileName({ clientName: "Acme SA", date })).toBe(
      "certificados-Acme-SA-2026-07-08.zip",
    );
  });

  test("certificateMatchesClient por id ou nome normalizado", () => {
    const customer = { id: "c1", name: "Acme SA" };
    expect(certificateMatchesClient({ end_customer_id: "c1", client_name: "Outro" }, customer)).toBe(true);
    expect(certificateMatchesClient({ end_customer_id: null, client_name: "  acme  sa " }, customer)).toBe(true);
    expect(certificateMatchesClient({ end_customer_id: "x", client_name: "acme sa" }, customer)).toBe(true);
    expect(certificateMatchesClient({ end_customer_id: "x", client_name: "Outro" }, customer)).toBe(false);
  });

  test("collectDownloadableCertificateIdsForClient agrega por nome mesmo com id nulo", () => {
    const customer = { id: "c1", name: "Cliente Teste" };
    const ids = collectDownloadableCertificateIdsForClient([
      { id: "1", status: "emitido", end_customer_id: "c1", client_name: "Cliente Teste" },
      { id: "2", status: "aprovado", end_customer_id: null, client_name: "cliente teste" },
      { id: "3", status: "rascunho", end_customer_id: "c1", client_name: "Cliente Teste" },
      { id: "4", status: "enviado", end_customer_id: "other", client_name: "Outro" },
    ], customer);
    expect(ids).toEqual(["1", "2"]);
  });

  test("downloadCertificatesZip empacota PDFs e resolve colisões de nome", async () => {
    const blobs = [
      new Blob(["a"], { type: "application/pdf" }),
      new Blob(["b"], { type: "application/pdf" }),
    ];
    const progress = [];
    const result = await downloadCertificatesZip({
      ids: ["1", "2"],
      loadCertificate: async (id) => ({ id, status: "emitido" }),
      exportPdf: async (cert) => ({
        blob: blobs[Number(cert.id) - 1],
        fileName: "mesmo.pdf",
      }),
      zipFileName: "teste.zip",
      onProgress: ({ index }) => progress.push(index),
    });
    expect(result.ok).toBe(2);
    expect(result.fail).toBe(0);
    expect(progress).toEqual([1, 2]);
    expect(global.URL.createObjectURL).toHaveBeenCalled();
  });
});
