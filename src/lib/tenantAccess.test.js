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

describe("tenantAccess", () => {
  test("isClientPortalTenant detecta modelo portal", () => {
    expect(isClientPortalTenant(portalTenant)).toBe(true);
    expect(isClientPortalTenant(fullTenant)).toBe(false);
  });

  test("CTLI admin vê ambiente full mesmo em tenant portal", () => {
    expect(isEffectiveClientPortal(portalTenant, "admin")).toBe(false);
    expect(isEffectiveClientPortal(portalTenant, "client")).toBe(true);
  });

  test("client_portal bloqueia pedidos e backup", () => {
    expect(canAccessModule({ tenant: portalTenant, role: "client", module: "pedidos_compra" })).toBe(false);
    expect(canAccessModule({ tenant: portalTenant, role: "client", module: "backup" })).toBe(false);
    expect(canAccessModule({ tenant: fullTenant, role: "gerente_qualidade", module: "pedidos_compra" })).toBe(true);
  });

  test("client_portal permite coleta e certificados", () => {
    expect(canAccessModule({ tenant: portalTenant, role: "client", module: "coleta" })).toBe(true);
    expect(canAccessModule({ tenant: portalTenant, role: "client", module: "certificados" })).toBe(true);
    expect(canAccessModule({ tenant: portalTenant, role: "gerente_qualidade", module: "coleta" })).toBe(true);
  });

  test("requisitos visíveis no portal incluem req 8", () => {
    const items = getVisibleReqMenuItems(portalTenant, "client");
    expect(items.map((i) => i.id)).toEqual(["5", "6", "7", "8"]);
    expect(canAccessRequirement({ tenant: portalTenant, role: "client", requirementId: "4" })).toBe(false);
    expect(canAccessRequirement({ tenant: portalTenant, role: "client", requirementId: "8" })).toBe(true);
  });

  test("pastas req 6/7/8 filtradas no portal", () => {
    const r6 = getFoldersForRequirement("6", portalTenant, "client").map((f) => f.folderKey);
    expect(r6).toEqual(["pr-6-2", "pr-6-4"]);
    const r7 = getFoldersForRequirement("7", portalTenant, "client").map((f) => f.folderKey);
    expect(r7).toEqual(["pr-7-1", "pr-7-2"]);
    const r8 = getFoldersForRequirement("8", portalTenant, "client").map((f) => f.folderKey);
    expect(r8).toEqual(["pr-8-3"]);
    expect(canAccessRequirementFolder({
      tenant: portalTenant,
      role: "client",
      requirementId: "6",
      folderKey: "pr-6-6",
    })).toBe(false);
  });

  test("cadastros portal oculta fornecedores e usuarios", () => {
    const sections = getVisibleCadastroSections("client", portalTenant).map((s) => s.id);
    expect(sections).not.toContain("fornecedores");
    expect(sections).not.toContain("usuarios");
    expect(sections).toContain("pesos");
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

  test("dashboard shortcuts portal — atalhos ativos filtrados por permissão", () => {
    for (const role of ["client", "signatario", "diretor", "gerente_qualidade"]) {
      const shortcuts = getVisibleDashboardShortcuts(role, portalTenant);
      expect(shortcuts.length).toBeGreaterThan(0);
      expect(shortcuts.length).toBeLessThanOrEqual(HERO_SHORTCUTS.length);
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
    expect(canAccessCadastroSection({ tenant: portalTenant, role: "client", sectionId: "usuarios" })).toBe(false);
    expect(canAccessCadastroSection({ tenant: portalTenant, role: "tecnico_campo", sectionId: "usuarios" })).toBe(false);
    expect(canAccessCadastroSection({ tenant: portalTenant, role: "client", sectionId: "config-coleta" })).toBe(false);
  });
});
