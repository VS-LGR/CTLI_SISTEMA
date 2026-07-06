import {
  isTechnicianOnlyNav,
  isSignatoryOnlyNav,
  usesRestrictedNav,
  restrictedNavHomePath,
} from "./roleNav";

describe("roleNav", () => {
  const portalTenant = { deployment_model: "client_portal" };
  const fullTenant = { deployment_model: "full" };

  test("portal desativa nav restrita para signatário", () => {
    expect(isTechnicianOnlyNav("tecnico_campo", portalTenant)).toBe(true);
    expect(isSignatoryOnlyNav("signatario", portalTenant)).toBe(false);
    expect(usesRestrictedNav("tecnico_campo", portalTenant)).toBe(true);
    expect(usesRestrictedNav("signatario", portalTenant)).toBe(false);
    expect(restrictedNavHomePath("tecnico_campo", portalTenant)).toContain("coleta");
    expect(restrictedNavHomePath("signatario", portalTenant)).toBe("/dashboard");
  });

  test("ambiente full mantém nav restrita", () => {
    expect(isTechnicianOnlyNav("tecnico_campo", fullTenant)).toBe(true);
    expect(isSignatoryOnlyNav("signatario", fullTenant)).toBe(true);
    expect(restrictedNavHomePath("tecnico_campo", fullTenant)).toContain("coleta");
    expect(restrictedNavHomePath("signatario", fullTenant)).toContain("aguardando_aprovacao");
  });
});
