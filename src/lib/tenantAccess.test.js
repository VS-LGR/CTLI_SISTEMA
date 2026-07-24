import {
  isClientPortalTenant,
  isEffectiveClientPortal,
  canAccessModule,
  canAccessRequirement,
  canAccessRequirementFolder,
  canAccessCadastroSection,
  getCreatableRolesForProvisioner,
  canProvisionerAssignRole,
  DEPLOYMENT_MODELS,
} from "./tenantAccess";
import { getVisibleReqMenuItems, getFoldersForRequirement } from "./requirementNavConfig";
import { getVisibleCadastroSections } from "./cadastroSections";
import { getVisibleDashboardShortcuts } from "./dashboardShortcuts";

const portalTenant = { deployment_model: DEPLOYMENT_MODELS.CLIENT_PORTAL };
const fullTenant = { deployment_model: DEPLOYMENT_MODELS.FULL };
const clientUser = { tenant_id: "tenant-abc" };

describe("tenantAccess", () => {
  test("isClientPortalTenant detecta modelo portal", () => {
    expect(isClientPortalTenant(portalTenant)).toBe(true);
    expect(isClientPortalTenant(fullTenant)).toBe(false);
  });

  test("CTLI admin vê ambiente full mesmo em tenant portal", () => {
    expect(isEffectiveClientPortal(portalTenant, "admin")).toBe(false);
    expect(isEffectiveClientPortal(portalTenant, "client")).toBe(true);
  });

  test("utilizador cliente — bloqueia pedidos, backup e cadastros", () => {
    expect(canAccessModule({ tenant: fullTenant, role: "client", module: "pedidos_compra", user: clientUser })).toBe(false);
    expect(canAccessModule({ tenant: fullTenant, role: "client", module: "backup", user: clientUser })).toBe(false);
    expect(canAccessModule({ tenant: fullTenant, role: "client", module: "cadastros", user: clientUser })).toBe(false);
  });

  test("gerente qualidade — req 4/6/8; coleta só com toggle", () => {
    expect(canAccessRequirement({ tenant: fullTenant, role: "gerente_qualidade", requirementId: "4", user: clientUser })).toBe(true);
    expect(canAccessRequirement({ tenant: fullTenant, role: "gerente_qualidade", requirementId: "7", user: clientUser })).toBe(false);
    expect(canAccessModule({ tenant: fullTenant, role: "gerente_qualidade", module: "coleta", user: clientUser })).toBe(false);
    expect(canAccessModule({
      tenant: fullTenant,
      role: "gerente_qualidade",
      module: "coleta",
      user: { ...clientUser, access_coleta: true },
    })).toBe(true);
    expect(canAccessCadastroSection({ tenant: fullTenant, role: "gerente_qualidade", sectionId: "pesos", user: clientUser })).toBe(true);
  });

  test("administrativo vendas — 7.1 e 7.1.7", () => {
    expect(canAccessRequirementFolder({
      tenant: fullTenant,
      role: "administrativo_vendas",
      requirementId: "7",
      folderKey: "pr-7-1",
      user: clientUser,
    })).toBe(true);
    expect(canAccessRequirementFolder({
      tenant: fullTenant,
      role: "administrativo_vendas",
      requirementId: "7",
      folderKey: "pr-7-2",
      user: clientUser,
    })).toBe(false);
  });

  test("administrativo compras — 6.6", () => {
    expect(canAccessRequirementFolder({
      tenant: fullTenant,
      role: "administrativo_compras",
      requirementId: "6",
      folderKey: "pr-6-6",
      user: clientUser,
    })).toBe(true);
    expect(canAccessRequirementFolder({
      tenant: fullTenant,
      role: "administrativo_compras",
      requirementId: "6",
      folderKey: "pr-6-2",
      user: clientUser,
    })).toBe(false);
    expect(canAccessModule({ tenant: fullTenant, role: "administrativo_compras", module: "pedidos_compra", user: clientUser })).toBe(true);
  });

  test("utilizador cliente — permite coleta, propostas e certificados", () => {
    expect(canAccessModule({ tenant: portalTenant, role: "client", module: "coleta", user: clientUser })).toBe(true);
    expect(canAccessModule({ tenant: portalTenant, role: "client", module: "certificados", user: clientUser })).toBe(true);
    expect(canAccessModule({ tenant: portalTenant, role: "client", module: "propostas", user: clientUser })).toBe(true);
    expect(canAccessModule({ tenant: portalTenant, role: "client", module: "lista_mestra", user: clientUser })).toBe(true);
  });

  test("utilizador cliente — requisitos 5, 7 e 8 apenas", () => {
    expect(canAccessRequirement({ tenant: fullTenant, role: "client", requirementId: "4", user: clientUser })).toBe(false);
    expect(canAccessRequirement({ tenant: fullTenant, role: "client", requirementId: "6", user: clientUser })).toBe(false);
    expect(canAccessRequirement({ tenant: fullTenant, role: "client", requirementId: "5", user: clientUser })).toBe(true);
    expect(canAccessRequirement({ tenant: fullTenant, role: "client", requirementId: "8", user: clientUser })).toBe(true);
  });

  test("tecnico de campo — apenas coleta", () => {
    expect(canAccessModule({ tenant: portalTenant, role: "tecnico_campo", module: "coleta" })).toBe(true);
    expect(canAccessModule({ tenant: portalTenant, role: "tecnico_campo", module: "certificados" })).toBe(false);
    expect(canAccessModule({ tenant: portalTenant, role: "tecnico_campo", module: "propostas" })).toBe(false);
    expect(canAccessModule({ tenant: portalTenant, role: "tecnico_campo", module: "cadastros" })).toBe(false);
    const shortcuts = getVisibleDashboardShortcuts("tecnico_campo", portalTenant);
    expect(shortcuts.every((s) => s.id === "coleta")).toBe(true);
  });

  test("diretor — sem atalhos operacionais", () => {
    expect(getVisibleDashboardShortcuts("diretor", portalTenant, clientUser)).toEqual([]);
    expect(canAccessModule({ tenant: portalTenant, role: "diretor", module: "coleta", user: clientUser })).toBe(false);
  });

  test("dashboard shortcuts cliente — propostas, coleta e certificados", () => {
    const shortcuts = getVisibleDashboardShortcuts("client", portalTenant, clientUser);
    expect(shortcuts.length).toBeGreaterThan(0);
    expect(shortcuts.every((s) => ["propostas", "coleta", "cert-balanca", "cert-peso"].includes(s.id))).toBe(true);
  });

  test("roles provisionáveis por admin vs client", () => {
    expect(getCreatableRolesForProvisioner("admin")).toContain("admin");
    expect(getCreatableRolesForProvisioner("client")).toContain("gerente_geral");
    expect(getCreatableRolesForProvisioner("client")).toContain("administrativo_compras");
    expect(getCreatableRolesForProvisioner("client")).not.toContain("admin");
    expect(canProvisionerAssignRole("client", "tecnico_campo")).toBe(true);
    expect(canProvisionerAssignRole("client", "client")).toBe(false);
  });

  test("canAccessCadastroSection usuarios só admin CTLI", () => {
    expect(canAccessCadastroSection({ tenant: portalTenant, role: "admin", sectionId: "usuarios" })).toBe(true);
    expect(canAccessCadastroSection({ tenant: portalTenant, role: "client", sectionId: "usuarios", user: clientUser })).toBe(false);
  });

  test("menu requisitos cliente portal legado", () => {
    const items = getVisibleReqMenuItems(portalTenant, "client", clientUser);
    expect(items.map((i) => i.id)).toEqual(["5", "7", "8"]);
    const r7 = getFoldersForRequirement("7", portalTenant, "client", clientUser).map((f) => f.folderKey);
    expect(r7).toEqual(["pr-7-1", "pr-7-2"]);
  });

  test("gerente qualidade vê cadastros no menu", () => {
    const sections = getVisibleCadastroSections("gerente_qualidade", fullTenant, clientUser).map((s) => s.id);
    expect(sections.length).toBeGreaterThan(0);
  });
});
