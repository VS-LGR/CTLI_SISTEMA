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
import { getVisibleDashboardShortcuts, CLIENT_PORTAL_SHORTCUTS } from "./dashboardShortcuts";

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
  });

  test("requisitos visíveis no portal", () => {
    const items = getVisibleReqMenuItems(portalTenant, "client");
    expect(items.map((i) => i.id)).toEqual(["5", "6", "7"]);
    expect(canAccessRequirement({ tenant: portalTenant, role: "client", requirementId: "4" })).toBe(false);
    expect(canAccessRequirement({ tenant: portalTenant, role: "client", requirementId: "5" })).toBe(true);
  });

  test("pastas req 6/7 filtradas no portal", () => {
    const r6 = getFoldersForRequirement("6", portalTenant, "client").map((f) => f.folderKey);
    expect(r6).toEqual(["pr-6-2", "pr-6-4"]);
    const r7 = getFoldersForRequirement("7", portalTenant, "client").map((f) => f.folderKey);
    expect(r7).toEqual(["pr-7-1", "pr-7-2"]);
    expect(canAccessRequirementFolder({
      tenant: portalTenant,
      role: "client",
      requirementId: "6",
      folderKey: "pr-6-6",
    })).toBe(false);
  });

  test("cadastros portal oculta fornecedores", () => {
    const sections = getVisibleCadastroSections("client", portalTenant).map((s) => s.id);
    expect(sections).not.toContain("fornecedores");
    expect(sections).toContain("pesos");
    expect(sections).toContain("usuarios");
  });

  test("dashboard shortcuts portal — 6 atalhos ativos", () => {
    const shortcuts = getVisibleDashboardShortcuts("client", portalTenant);
    expect(shortcuts.length).toBe(CLIENT_PORTAL_SHORTCUTS.length);
    expect(shortcuts.every((s) => s.active)).toBe(true);
  });

  test("roles provisionáveis por admin vs client", () => {
    expect(getCreatableRolesForProvisioner("admin")).toContain("admin");
    expect(getCreatableRolesForProvisioner("client")).not.toContain("admin");
    expect(canProvisionerAssignRole("client", "tecnico_campo")).toBe(true);
    expect(canProvisionerAssignRole("client", "client")).toBe(false);
  });

  test("canAccessCadastroSection usuarios só admin/client", () => {
    expect(canAccessCadastroSection({ tenant: portalTenant, role: "client", sectionId: "usuarios" })).toBe(true);
    expect(canAccessCadastroSection({ tenant: portalTenant, role: "tecnico_campo", sectionId: "usuarios" })).toBe(false);
  });
});
