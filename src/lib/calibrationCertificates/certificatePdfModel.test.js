import { addOneYear, defaultValidityDate } from "./certificateDateUtils";
import { getRbcObservations, getRastreavelObservations } from "../certificatePdf/legalObservations";
import {
  resolveActivePlatformPanel,
  platformPanelDisplayLabel,
  PLATFORM_DIAGRAM_PANELS,
} from "../certificatePdf/platformDiagramAssets";

describe("certificateDateUtils", () => {
  test("addOneYear advances date by one year", () => {
    expect(addOneYear("2026-01-05")).toBe("2027-01-05");
    expect(defaultValidityDate("2026-06-17")).toBe("2027-06-17");
  });
});

describe("legalObservations", () => {
  test("RBC has 7 numbered legal items", () => {
    expect(getRbcObservations()).toHaveLength(7);
    expect(getRbcObservations()[3]).toContain("17025");
  });

  test("Rastreável omits acreditação wording in item 4", () => {
    const items = getRastreavelObservations();
    expect(items).toHaveLength(7);
    expect(items[3]).toContain("rastreável");
    expect(items[3]).not.toContain("17025");
  });
});

describe("platformDiagramAssets", () => {
  test("resolveActivePlatformPanel maps tipo_plataforma to panel id", () => {
    expect(resolveActivePlatformPanel("retangular_quadrada")).toBe("retangular_quadrada");
    expect(resolveActivePlatformPanel("redondo")).toBe("redondo");
    expect(resolveActivePlatformPanel("rodoviaria")).toBe("rodoviaria");
    expect(resolveActivePlatformPanel("ferroviaria")).toBe("rodoviaria");
    expect(resolveActivePlatformPanel("excentricidade_na")).toBeNull();
    expect(resolveActivePlatformPanel("")).toBeNull();
  });

  test("platformPanelDisplayLabel adapts ferroviaria on rodoviaria panel", () => {
    const rodPanel = PLATFORM_DIAGRAM_PANELS.find((p) => p.id === "rodoviaria");
    expect(platformPanelDisplayLabel(rodPanel, "ferroviaria")).toBe("Rodoviária / Ferroviária");
    expect(platformPanelDisplayLabel(rodPanel, "rodoviaria")).toBe("Rodoviária");
  });
});
