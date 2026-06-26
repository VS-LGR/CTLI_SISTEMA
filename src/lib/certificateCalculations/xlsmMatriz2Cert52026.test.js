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
  buildPointCalculationTrace,
} from "./index";
import { calculateBuoyancyUncertainty } from "./buoyancyCalculations";
import { buildCertificatePdfViewModel } from "@/lib/certificatePdf/viewModel";

const MATRIZ_CERT = audit.certificates.find((c) => c.name === "Validação 2026");
const GOLDEN = golden.cases.find((c) => c.id === "validacao-2025-210g");

const ENV_VALIDACAO_2026 = {
  initial_temperature: "24",
  final_temperature: "23",
  initial_humidity: "65",
  final_humidity: "55",
  initial_pressure: "935",
  final_pressure: "935",
};

describe("Certificado 5/2026 × Matriz (2) Validação 2026", () => {
  test("EMP.P1 — ue ≈ 0,000059497 (Empuxo.CSV linha 6)", () => {
    const emp = calculateBuoyancyUncertainty({
      conventionalMass: 210,
      materialDensity: 7900,
      environmental: ENV_VALIDACAO_2026,
    });
    const sheet = MATRIZ_CERT.points[0].calc;
    expect(emp.ue).toBeCloseTo(sheet.ue, 6);
    expect(emp.ue).toBeCloseTo(0.000059497, 5);
    expect(emp.memory.empX).toBeGreaterThan(0);
    expect(emp.urel).toBeCloseTo(2.8332e-7, 6);
  });

  test("motor cert 5/2026 — memória EMP e rastreio espelham Empuxo.CSV", () => {
    const points = [{
      ...GOLDEN.points[0],
      material_density: "7900",
    }];
    const results = calculateCertificatePoints(
      points,
      GOLDEN.balance,
      GOLDEN.weightItems,
      GOLDEN.weightCerts,
      ENV_VALIDACAO_2026,
    );
    const pt = results[0];
    const mem = pt.calculation_memory;
    const sheet = MATRIZ_CERT.points[0].calc;

    expect(mem.buoyancy_method).toBe("emp");
    expect(mem.ue).toBeCloseTo(sheet.ue, 6);
    expect(mem.empDeltaT).toBeCloseTo(-1, 4);
    expect(mem.empDeltaRh).toBeCloseTo(-10, 4);
    expect(mem.empUrel).toBeCloseTo(2.8332e-7, 6);
    expect(mem.empX).toBeGreaterThan(0);

    const trace = buildPointCalculationTrace(pt, GOLDEN.balance, "g");
    const ids = trace.steps.map((s) => s.id);
    expect(ids).toContain("emp_deltas");
    expect(ids).toContain("emp_Urel");
    expect(ids).toContain("empuxo");
    expect(ids.some((id) => id.includes("ppm"))).toBe(false);

    const empStep = trace.steps.find((s) => s.id === "empuxo");
    expect(empStep.formula).toMatch(/EMP\.P1/);
    expect(empStep.expression).not.toMatch(/PPM/);
  });

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
      ENV_VALIDACAO_2026,
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
      ENV_VALIDACAO_2026,
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
      ENV_VALIDACAO_2026,
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
