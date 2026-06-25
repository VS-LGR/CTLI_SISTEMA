/**
 * Certificado 5/2026 (Validação 2026 na Matriz (2)) — verificação cruzada motor × planilha × PDF.
 */
import audit from "./__fixtures__/xlsm-matriz2-audit.json";
import golden from "./__fixtures__/xlsm-golden.json";
import {
  calculateCertificatePoints,
  buildCertificatePointDisplay,
  enrichCertificatePointsForDisplay,
  resolvePointVeff,
} from "./index";
import { buildCertificatePdfViewModel } from "@/lib/certificatePdf/viewModel";

const MATRIZ_CERT = audit.certificates.find((c) => c.name === "Validação 2026");
const GOLDEN = golden.cases.find((c) => c.id === "validacao-2025-210g");

describe("Certificado 5/2026 × Matriz (2) Validação 2026", () => {
  test("planilha P1 — Veff_raw=100, display ∞, Ue=0,0007", () => {
    const p1 = MATRIZ_CERT.points.find((p) => p.calc.point_number === 1);
    expect(p1.calc.veff_raw).toBe(100);
    expect(p1.display.veff).toBe("∞");
    expect(p1.display.expanded_uncertainty).toBeCloseTo(0.0007, 4);
    expect(p1.display.k).toBe(2);
    expect(p1.calc.expanded_uncertainty).toBeCloseTo(0.0006251610815016501, 6);
  });

  test("motor — Veff=100 e k=2 quando ua=0 (fórmula Welch Matriz col 34)", () => {
    const results = calculateCertificatePoints(
      GOLDEN.points,
      GOLDEN.balance,
      GOLDEN.weightItems,
      GOLDEN.weightCerts,
      GOLDEN.environmental,
    );
    const pt = results[0];
    const sheet = MATRIZ_CERT.points[0].calc;

    expect(pt.calculation_memory.ua).toBe(0);
    expect(pt.degrees_of_freedom).toBe(100);
    expect(sheet.veff_raw).toBe(100);
    expect(pt.coverage_factor).toBeCloseTo(sheet.coverage_factor, 2);
    expect(resolvePointVeff(pt)).toBe("∞");
  });

  test("display Certificado-RBC — Ue e Veff alinham com planilha Validação 2026 P1", () => {
    const results = calculateCertificatePoints(
      GOLDEN.points,
      GOLDEN.balance,
      GOLDEN.weightItems,
      GOLDEN.weightCerts,
      GOLDEN.environmental,
    );
    const display = buildCertificatePointDisplay(results[0], GOLDEN.balance, "g");
    const sheet = MATRIZ_CERT.points[0].display;

    expect(display.expandedUncertainty).toBeCloseTo(sheet.expanded_uncertainty, 4);
    expect(display.veff).toBe(sheet.veff);
    expect(Number(results[0].coverage_factor)).toBeCloseTo(sheet.k, 2);
  });

  test("PDF viewModel — cert 5/2026 com Veff ausente no DB ainda exibe ∞", () => {
    const results = calculateCertificatePoints(
      GOLDEN.points,
      GOLDEN.balance,
      GOLDEN.weightItems,
      GOLDEN.weightCerts,
      GOLDEN.environmental,
    );
    const pt = results[0];
    const certDbLike = enrichCertificatePointsForDisplay({
      certificate_type: "rbc",
      certificate_number: 5,
      certificate_year: 2026,
      balance_snapshot: GOLDEN.balance,
      points: [{
        ...pt,
        degrees_of_freedom: null,
      }],
    });

    expect(resolvePointVeff(certDbLike.points[0])).toBe("∞");
    const model = buildCertificatePdfViewModel(certDbLike);
    expect(model.repeatabilityRows[0].veff).toBe("∞");
    expect(model.repeatabilityRows[0].expandedUncertainty.value).toBe("0,0007");
    expect(model.repeatabilityRows[0].k).toBe("2,00");
  });
});
