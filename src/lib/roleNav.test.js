import {
  isTechnicianOnlyNav,
  isSignatoryOnlyNav,
  usesRestrictedNav,
  usesClientSidebarNav,
  restrictedNavHomePath,
} from "./roleNav";

describe("roleNav", () => {
  const portalTenant = { deployment_model: "client_portal" };
  const fullTenant = { deployment_model: "full" };
  const clientUser = { tenant_id: "tenant-1" };

  test("usesClientSidebarNav — utilizadores com tenant fixo", () => {
    expect(usesClientSidebarNav("client", portalTenant, clientUser)).toBe(true);
    expect(usesClientSidebarNav("gerente_qualidade", fullTenant, clientUser)).toBe(true);
    expect(usesClientSidebarNav("admin", portalTenant, clientUser)).toBe(false);
    expect(usesClientSidebarNav("client", portalTenant, { tenant_id: null })).toBe(false);
    expect(usesClientSidebarNav("tecnico_campo", portalTenant, clientUser)).toBe(false);
    expect(usesClientSidebarNav("signatario", fullTenant, clientUser)).toBe(false);
    expect(usesClientSidebarNav("signatario", portalTenant, clientUser)).toBe(true);
  });

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
