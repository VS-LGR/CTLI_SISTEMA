import { addOneYear, defaultValidityDate } from "./certificateDateUtils";
import { getRbcObservations, getRastreavelObservations } from "../certificatePdf/legalObservations";
import { getCertificateLayoutMetrics } from "../certificatePdf/certificatePdfLayout";
import { repeatabilityRowsForPdfLayout } from "../certificatePdf/viewModel";
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

describe("certificatePdfLayout", () => {
  test("modo compacto prepara certificado emitido para uma página", () => {
    const compact = getCertificateLayoutMetrics(true);
    const standard = getCertificateLayoutMetrics(false);
    expect(compact.singlePage).toBe(true);
    expect(compact.observationColumns).toBe(2);
    expect(compact.repeatabilityMinRows).toBe(5);
    expect(compact.platformImgH).toBeLessThan(standard.platformImgH);
    expect(compact.compactTableFontSize).toBeLessThan(standard.compactTableFontSize);
  });

  test("repeatabilityRowsForPdfLayout reduz linhas vazias", () => {
    const rows = Array.from({ length: 10 }, (_, i) => ({ empty: i > 0 }));
    const compact = getCertificateLayoutMetrics(true);
    expect(repeatabilityRowsForPdfLayout(rows, compact)).toHaveLength(5);
    expect(repeatabilityRowsForPdfLayout(rows, getCertificateLayoutMetrics(false))).toHaveLength(10);
  });
});

describe("legalObservations", () => {
  test("RBC has 7 numbered legal items", () => {
    expect(getRbcObservations()).toHaveLength(7);
    expect(getRbcObservations()[1]).toContain("CTLI");
    expect(getRbcObservations()[4]).toContain("17025");
  });

  test("Rastreável menciona credenciamento IPEM-MG", () => {
    const items = getRastreavelObservations();
    expect(items).toHaveLength(7);
    expect(items[4]).toContain("IPEM-MG");
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

  test("each panel points to dedicated webp asset", () => {
    expect(PLATFORM_DIAGRAM_PANELS).toHaveLength(3);
    expect(PLATFORM_DIAGRAM_PANELS[0].src).toContain("Quadrada%20ou%20retangular");
    expect(PLATFORM_DIAGRAM_PANELS[1].src).toContain("RedondaBalan%C3%A7as.webp");
    expect(PLATFORM_DIAGRAM_PANELS[2].src).toContain("RodoviariaBalan%C3%A7as.webp");
  });
});
