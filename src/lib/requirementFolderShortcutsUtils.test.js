import { isModuleLinkActive } from "./requirementFolderShortcutsUtils";
import { getFolderNavChildren, getFoldersForRequirement } from "./requirementNavConfig";
import { cadastroSectionPath } from "./cadastroSections";
import { DEVICE_SHEET_LIST_PATH } from "./deviceTechnicalSheetRoutes";

const fullTenant = { deployment_model: "full" };

describe("requirementFolderShortcutsUtils", () => {
  test("isModuleLinkActive reconhece rota exata e sub-rotas", () => {
    const location = { pathname: "/requirement/6/pr-6-4/cadastro/pesos", search: "" };
    expect(isModuleLinkActive(location, cadastroSectionPath("pesos"))).toBe(true);
    expect(isModuleLinkActive(location, DEVICE_SHEET_LIST_PATH)).toBe(false);
    expect(isModuleLinkActive(
      { pathname: "/requirement/6/pr-6-4/fichas/item-1", search: "" },
      DEVICE_SHEET_LIST_PATH,
    )).toBe(true);
  });

  test("isModuleLinkActive reconhece destinos com query string", () => {
    const location = { pathname: "/requirement/6/pr-6-4", search: "?tab=procedimentos" };
    expect(isModuleLinkActive(location, "/requirement/6/pr-6-4?tab=procedimentos")).toBe(true);
  });
});

describe("PR folder shortcuts nav", () => {
  test("pr-6-4 admin inclui fichas e cadastros com rotas corretas", () => {
    const folder = getFoldersForRequirement("6", fullTenant, "admin").find((f) => f.folderKey === "pr-6-4");
    const items = getFolderNavChildren(folder, {
      canColeta: true,
      canCalibrationCertificates: true,
      canPersonnelStandardOptions: true,
      canMasterDocuments: true,
      canCommercialProposals: true,
      canCtliAdmin: true,
      canTechnicians: true,
      tenant: fullTenant,
      role: "admin",
      user: null,
    });
    const byKey = Object.fromEntries(items.map((i) => [i.key, i]));
    expect(byKey.fichas.to).toBe(DEVICE_SHEET_LIST_PATH);
    expect(byKey["cad-pesos"].to).toBe(cadastroSectionPath("pesos"));
    expect(byKey["cad-cert-peso"].kind).toBe("cadastro");
  });

  test("pr-6-5 não tem atalhos", () => {
    const folder = getFoldersForRequirement("6", fullTenant, "admin").find((f) => f.folderKey === "pr-6-5");
    const items = getFolderNavChildren(folder, {
      canColeta: true,
      canCalibrationCertificates: true,
      canPersonnelStandardOptions: true,
      canMasterDocuments: true,
      canCommercialProposals: true,
      canCtliAdmin: true,
      canTechnicians: true,
      tenant: fullTenant,
      role: "admin",
      user: null,
    });
    expect(items).toEqual([]);
  });
});
