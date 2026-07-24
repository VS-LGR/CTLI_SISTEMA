import {
  canApproveCalibrationCertificate,
  canSendCertificateEmail,
  canEditCalibrationCertificate,
  canAccessColeta,
  canAccessCalibrationCertificates,
  isSignatoryOnlyNav,
  isDirectorOnlyNav,
} from "./roles";

describe("certificate email roles", () => {
  test("signatario can approve and send but not edit technically", () => {
    expect(canApproveCalibrationCertificate("signatario")).toBe(true);
    expect(canSendCertificateEmail("signatario")).toBe(true);
    expect(canEditCalibrationCertificate("signatario")).toBe(false);
    expect(isSignatoryOnlyNav("signatario")).toBe(true);
  });

  test("tecnico_campo cannot approve or send certificates", () => {
    expect(canApproveCalibrationCertificate("tecnico_campo")).toBe(false);
    expect(canSendCertificateEmail("tecnico_campo")).toBe(false);
    expect(canEditCalibrationCertificate("tecnico_campo")).toBe(false);
  });

  test("gerentes precisam de toggle para certs; diretor não envia", () => {
    expect(canSendCertificateEmail("gerente_qualidade")).toBe(false);
    expect(canSendCertificateEmail("gerente_qualidade", { access_certificados: true })).toBe(true);
    expect(canSendCertificateEmail("administrativo_vendas", { access_certificados: true })).toBe(true);
    expect(canSendCertificateEmail("diretor")).toBe(false);
    expect(isDirectorOnlyNav("diretor")).toBe(true);
  });

  test("ACL version 1 controla edição de certificados", () => {
    expect(
      canEditCalibrationCertificate("gerente_qualidade", {
        access_acl: { version: 1, modules: ["certificados"], folders: {} },
        access_certificados: false,
      }),
    ).toBe(true);
    expect(
      canEditCalibrationCertificate("gerente_qualidade", {
        access_acl: { version: 1, modules: ["coleta"], folders: {} },
        access_certificados: true,
      }),
    ).toBe(false);
  });
});
