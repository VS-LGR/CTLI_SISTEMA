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

describe("certificate enviado lifecycle", () => {
  test("aprovado and emitido can transition to enviado", () => {
    expect(canTransitionCertificateStatus("aprovado", "enviado")).toBe(true);
    expect(canTransitionCertificateStatus("emitido", "enviado")).toBe(true);
  });

  test("enviado allows re-send and substitution paths", () => {
    expect(canTransitionCertificateStatus("enviado", "enviado")).toBe(true);
    expect(canTransitionCertificateStatus("enviado", "substituido")).toBe(true);
    expect(canTransitionCertificateStatus("enviado", "cancelado")).toBe(true);
  });

  test("canMarkCertificateObsolete includes enviado but not emitido", () => {
    expect(canMarkCertificateObsolete("enviado")).toBe(true);
    expect(canMarkCertificateObsolete("emitido")).toBe(false);
  });
});
