import { resolveHelpModule, getHelpCatalogModules, getHelpCatalogModulesForUser, HELP_PATH } from "./helpModules";
import { hasSeenTour, markTourSeen, resetTour } from "./tourStorage";

describe("helpModules", () => {
  it("resolveHelpModule identifica propostas e coleta", () => {
    expect(resolveHelpModule("/propostas-comerciais")?.moduleKey).toBe("propostas");
    expect(resolveHelpModule("/requirement/7/pr-7-2/coleta")?.moduleKey).toBe("coleta");
    expect(resolveHelpModule(HELP_PATH)?.moduleKey).toBe("ajuda");
  });

  it("catálogo não inclui a entrada ajuda", () => {
    expect(getHelpCatalogModules().some((m) => m.moduleKey === "ajuda")).toBe(false);
    expect(getHelpCatalogModules().length).toBeGreaterThan(3);
  });

  it("cada passo do catálogo tem highlight", () => {
    for (const mod of getHelpCatalogModules()) {
      for (const step of mod.steps || []) {
        expect(step.highlight).toBeTruthy();
      }
      for (const step of mod.signatorySteps || []) {
        expect(step.highlight).toBeTruthy();
      }
      for (const step of mod.directorSteps || []) {
        expect(step.highlight).toBeTruthy();
      }
    }
  });

  it("filtra catálogo por papel", () => {
    const tecnico = getHelpCatalogModulesForUser({ role: "tecnico_campo", user: { tenant_id: "t1" } });
    expect(tecnico.every((m) => m.moduleKey === "coleta")).toBe(true);

    const diretor = getHelpCatalogModulesForUser({ role: "diretor", user: { tenant_id: "t1" } });
    expect(diretor.map((m) => m.moduleKey)).toEqual(["dashboard"]);

    const signatario = getHelpCatalogModulesForUser({ role: "signatario", user: { tenant_id: "t1" } });
    expect(signatario.every((m) => m.moduleKey.startsWith("certificados"))).toBe(true);
  });
});

describe("tourStorage", () => {
  const userId = "user-test-1";
  const moduleKey = "propostas";

  beforeEach(() => {
    resetTour(userId, moduleKey);
  });

  it("marca e lê tour visto", () => {
    expect(hasSeenTour(userId, moduleKey)).toBe(false);
    markTourSeen(userId, moduleKey);
    expect(hasSeenTour(userId, moduleKey)).toBe(true);
    resetTour(userId, moduleKey);
    expect(hasSeenTour(userId, moduleKey)).toBe(false);
  });
});
