import { resolveHelpModule, getHelpCatalogModules, HELP_PATH } from "./helpModules";
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
