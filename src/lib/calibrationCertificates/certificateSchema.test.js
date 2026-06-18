import {
  canMarkCertificateObsolete,
  canDeleteCertificate,
  canTransitionCertificateStatus,
} from "./certificateSchema";

describe("certificate obsolete lifecycle", () => {
  test("canMarkCertificateObsolete allows terminal and draft states except emitido", () => {
    expect(canMarkCertificateObsolete("cancelado")).toBe(true);
    expect(canMarkCertificateObsolete("substituido")).toBe(true);
    expect(canMarkCertificateObsolete("rascunho")).toBe(true);
    expect(canMarkCertificateObsolete("emitido")).toBe(false);
    expect(canMarkCertificateObsolete("obsoleto")).toBe(false);
  });

  test("canDeleteCertificate only when obsoleto", () => {
    expect(canDeleteCertificate("obsoleto")).toBe(true);
    expect(canDeleteCertificate("cancelado")).toBe(false);
    expect(canDeleteCertificate("emitido")).toBe(false);
  });

  test("transitions to obsoleto from cancelado and substituido", () => {
    expect(canTransitionCertificateStatus("cancelado", "obsoleto")).toBe(true);
    expect(canTransitionCertificateStatus("substituido", "obsoleto")).toBe(true);
    expect(canTransitionCertificateStatus("emitido", "obsoleto")).toBe(false);
  });
});
