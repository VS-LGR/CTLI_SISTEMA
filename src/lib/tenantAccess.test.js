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
import { getVisibleDashboardShortcuts, HERO_SHORTCUTS } from "./dashboardShortcuts";

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

  test("utilizador cliente — bloqueia pedidos, backup e cadastros em full tenant", () => {
    expect(canAccessModule({ tenant: fullTenant, role: "client", module: "pedidos_compra", user: clientUser })).toBe(false);
    expect(canAccessModule({ tenant: fullTenant, role: "client", module: "backup", user: clientUser })).toBe(false);
    expect(canAccessModule({ tenant: fullTenant, role: "client", module: "cadastros", user: clientUser })).toBe(false);
    expect(canAccessModule({ tenant: fullTenant, role: "gerente_qualidade", module: "pedidos_compra", user: clientUser })).toBe(false);
    expect(canAccessModule({ tenant: fullTenant, role: "gerente_qualidade", module: "pedidos_compra" })).toBe(true);
  });

  test("utilizador cliente — permite coleta, propostas e certificados", () => {
    expect(canAccessModule({ tenant: portalTenant, role: "client", module: "coleta", user: clientUser })).toBe(true);
    expect(canAccessModule({ tenant: portalTenant, role: "client", module: "certificados", user: clientUser })).toBe(true);
    expect(canAccessModule({ tenant: portalTenant, role: "client", module: "propostas", user: clientUser })).toBe(true);
    expect(canAccessModule({ tenant: portalTenant, role: "client", module: "lista_mestra", user: clientUser })).toBe(true);
    expect(canAccessModule({ tenant: portalTenant, role: "gerente_qualidade", module: "coleta", user: clientUser })).toBe(true);
  });

  test("utilizador cliente — requisitos 5, 7 e 8 apenas", () => {
    expect(canAccessRequirement({ tenant: fullTenant, role: "client", requirementId: "4", user: clientUser })).toBe(false);
    expect(canAccessRequirement({ tenant: fullTenant, role: "client", requirementId: "6", user: clientUser })).toBe(false);
    expect(canAccessRequirement({ tenant: fullTenant, role: "client", requirementId: "5", user: clientUser })).toBe(true);
    expect(canAccessRequirement({ tenant: fullTenant, role: "client", requirementId: "8", user: clientUser })).toBe(true);
  });

  test("utilizador cliente — pastas restritas", () => {
    expect(canAccessRequirementFolder({
      tenant: fullTenant,
      role: "client",
      requirementId: "5",
      folderKey: "manual-qualidade",
      user: clientUser,
    })).toBe(true);
    expect(canAccessRequirementFolder({
      tenant: fullTenant,
      role: "client",
      requirementId: "5",
      folderKey: "politica-qualidade",
      user: clientUser,
    })).toBe(false);
    expect(canAccessRequirementFolder({
      tenant: fullTenant,
      role: "client",
      requirementId: "6",
      folderKey: "pr-6-2",
      user: clientUser,
    })).toBe(false);
    expect(canAccessRequirementFolder({
      tenant: fullTenant,
      role: "client",
      requirementId: "7",
      folderKey: "pr-7-2",
      user: clientUser,
    })).toBe(true);
    expect(canAccessRequirementFolder({
      tenant: fullTenant,
      role: "client",
      requirementId: "8",
      folderKey: "pr-8-3",
      user: clientUser,
    })).toBe(true);
  });

  test("utilizador cliente — sem cadastros", () => {
    const sections = getVisibleCadastroSections("client", portalTenant, clientUser).map((s) => s.id);
    expect(sections).toEqual([]);
    expect(canAccessCadastroSection({ tenant: portalTenant, role: "client", sectionId: "pesos", user: clientUser })).toBe(false);
  });

  test("tecnico de campo — apenas coleta no portal", () => {
    expect(canAccessModule({ tenant: portalTenant, role: "tecnico_campo", module: "coleta" })).toBe(true);
    expect(canAccessModule({ tenant: portalTenant, role: "tecnico_campo", module: "certificados" })).toBe(false);
    expect(canAccessModule({ tenant: portalTenant, role: "tecnico_campo", module: "propostas" })).toBe(false);
    expect(canAccessModule({ tenant: portalTenant, role: "tecnico_campo", module: "cadastros" })).toBe(false);
    expect(canAccessCadastroSection({ tenant: portalTenant, role: "tecnico_campo", sectionId: "pesos" })).toBe(false);
    const shortcuts = getVisibleDashboardShortcuts("tecnico_campo", portalTenant);
    expect(shortcuts.every((s) => s.id === "coleta")).toBe(true);
  });

  test("dashboard shortcuts utilizador cliente — propostas, coleta e certificados (balança e peso)", () => {
    for (const role of ["client", "signatario", "diretor", "gerente_qualidade"]) {
      const shortcuts = getVisibleDashboardShortcuts(role, portalTenant, clientUser);
      expect(shortcuts.length).toBeGreaterThan(0);
      expect(shortcuts.length).toBeLessThanOrEqual(4);
      expect(shortcuts.every((s) => ["propostas", "coleta", "cert-balanca", "cert-peso"].includes(s.id))).toBe(true);
      expect(shortcuts.some((s) => s.id === "cert-peso")).toBe(true);
      expect(shortcuts.every((s) => s.active)).toBe(true);
    }
  });

  test("tecnico portal não acede cadastros", () => {
    expect(canAccessCadastroSection({ tenant: portalTenant, role: "tecnico_campo", sectionId: "pesos" })).toBe(false);
    expect(canAccessCadastroSection({ tenant: portalTenant, role: "tecnico_campo", sectionId: "balancas" })).toBe(false);
    expect(canAccessCadastroSection({ tenant: portalTenant, role: "tecnico_campo", sectionId: "usuarios" })).toBe(false);
  });

  test("roles provisionáveis por admin vs client", () => {
    expect(getCreatableRolesForProvisioner("admin")).toContain("admin");
    expect(getCreatableRolesForProvisioner("client")).not.toContain("admin");
    expect(canProvisionerAssignRole("client", "tecnico_campo")).toBe(true);
    expect(canProvisionerAssignRole("client", "client")).toBe(false);
  });

  test("canAccessCadastroSection usuarios só admin CTLI", () => {
    expect(canAccessCadastroSection({ tenant: portalTenant, role: "admin", sectionId: "usuarios" })).toBe(true);
    expect(canAccessCadastroSection({ tenant: portalTenant, role: "client", sectionId: "usuarios", user: clientUser })).toBe(false);
    expect(canAccessCadastroSection({ tenant: portalTenant, role: "tecnico_campo", sectionId: "usuarios" })).toBe(false);
    expect(canAccessCadastroSection({ tenant: portalTenant, role: "client", sectionId: "config-coleta", user: clientUser })).toBe(false);
  });

  test("portal legado sem user — mantém regras antigas para testes de pasta", () => {
    const items = getVisibleReqMenuItems(portalTenant, "client");
    expect(items.map((i) => i.id)).toEqual(["5", "6", "7", "8"]);
    const r7 = getFoldersForRequirement("7", portalTenant, "client").map((f) => f.folderKey);
    expect(r7).toEqual(["pr-7-1", "pr-7-2"]);
  });
});
