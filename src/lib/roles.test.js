import {
  canApproveCalibrationCertificate,
  canSendCertificateEmail,
  canEditCalibrationCertificate,
  isSignatoryOnlyNav,
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

  test("gerentes and administrativo_vendas can send email", () => {
    expect(canSendCertificateEmail("gerente_qualidade")).toBe(true);
    expect(canSendCertificateEmail("gerente_tecnico")).toBe(true);
    expect(canSendCertificateEmail("administrativo_vendas")).toBe(true);
    expect(canSendCertificateEmail("diretor")).toBe(true);
  });
});
