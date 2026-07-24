import {
  isTechnicianOnlyNav,
  isSignatoryOnlyNav,
  isDirectorOnlyNav,
  usesRestrictedNav,
  usesClientSidebarNav,
  restrictedNavHomePath,
} from "./roleNav";

describe("roleNav", () => {
  const portalTenant = { deployment_model: "client_portal" };
  const fullTenant = { deployment_model: "full" };
  const clientUser = { tenant_id: "tenant-1" };

  test("usesClientSidebarNav — apenas conta client", () => {
    expect(usesClientSidebarNav("client", portalTenant, clientUser)).toBe(true);
    expect(usesClientSidebarNav("gerente_qualidade", fullTenant, clientUser)).toBe(false);
    expect(usesClientSidebarNav("admin", portalTenant, clientUser)).toBe(false);
    expect(usesClientSidebarNav("tecnico_campo", portalTenant, clientUser)).toBe(false);
    expect(usesClientSidebarNav("signatario", portalTenant, clientUser)).toBe(false);
  });

  test("nav restrita para técnico, signatário e diretor", () => {
    expect(isTechnicianOnlyNav("tecnico_campo")).toBe(true);
    expect(isSignatoryOnlyNav("signatario")).toBe(true);
    expect(isDirectorOnlyNav("diretor")).toBe(true);
    expect(usesRestrictedNav("tecnico_campo")).toBe(true);
    expect(usesRestrictedNav("signatario")).toBe(true);
    expect(usesRestrictedNav("diretor")).toBe(true);
    expect(restrictedNavHomePath("tecnico_campo")).toContain("coleta");
    expect(restrictedNavHomePath("signatario")).toContain("aprovacao");
    expect(restrictedNavHomePath("diretor")).toBe("/dashboard");
  });
});
