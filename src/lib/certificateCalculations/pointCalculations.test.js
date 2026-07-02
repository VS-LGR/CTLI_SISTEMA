import {
  calculatePointAverage,
  calculateRepeatability,
  calculateCalibrationPoint,
  calculateResolutionContribution,
  standardUncertaintyUpFromWeightIds,
  driftUncertaintyUdFromWeightIds,
  resolveReadingsAfter,
  resolveResolutionForNominal,
  welchSatterthwaiteNuEff,
  coverageFactorFromNu,
  truncateVeff,
  veffForDbStorage,
  VEFF_INFINITE_SENTINEL,
} from "./pointCalculations";
import { decimalPlacesFromResolution } from "./parseNumber";
import {
  calculateToleranceOiml,
  evaluatePointConformity,
  determineInstrumentClass,
} from "./conformityCalculations";
import { correctConventionalMassForBuoyancy, shouldApplyVccCorrection } from "./conventionalMassCorrection";
import { calculateBuoyancyUncertainty } from "./buoyancyCalculations";
import { calculateCertificatePoints } from "./index";
import { roundExpandedUncertainty, roundIndicationError } from "./certificateDisplayRounding";

describe("certificateCalculations", () => {
  test("calculatePointAverage with three readings", () => {
    const res = calculatePointAverage(["5.01", "5.02", "5.03"]);
    expect(res.valid).toBe(true);
    expect(res.value).toBeCloseTo(5.02, 4);
  });

  test("calculateRepeatability matches STDEV/sqrt(n) pattern", () => {
    const readings = ["5.00", "5.01", "5.02"];
    const res = calculateRepeatability(readings);
    expect(res.valid).toBe(true);
    expect(res.value).toBeGreaterThan(0);
  });

  test("ur = d/(2*sqrt(3))", () => {
    const res = calculateResolutionContribution("0.0001");
    expect(res.valid).toBe(true);
    expect(res.value).toBeCloseTo(0.0001 / (2 * Math.sqrt(3)), 8);
  });

  test("calculateCalibrationPoint produces expanded uncertainty (5 componentes)", () => {
    const calc = calculateCalibrationPoint(
      {
        nominal_value: "5",
        reading1: "5.01",
        reading2: "5.02",
        reading3: "5.03",
        reading_before_adjustment: "5.05",
      },
      {
        resolution: "0.01",
        unit: "g",
        up: 0.0002,
        ud: 0.0001,
        ue: 0.00005,
      },
    );
    expect(calc.calcStatus).toBe("calculado");
    expect(calc.results.expanded_uncertainty).toBeGreaterThan(0);
    expect(calc.results.average_reading).toBeCloseTo(5.02, 4);
    expect(calc.results.calculation_memory.ua).toBeDefined();
    expect(calc.results.calculation_memory.up).toBe(0.0002);
  });

  test("sem ajuste — não calcula erro antes do ajuste (planilha P1 bloco vazio)", () => {
    const calc = calculateCalibrationPoint(
      {
        nominal_value: "200",
        reading1: "200",
        reading2: "200",
        reading3: "200",
        reading_before_adjustment: "200.05",
      },
      {
        resolution: "0.0001",
        unit: "g",
        referenceValue: 200,
        adjustmentPerformed: false,
      },
    );
    expect(calc.calcStatus).toBe("calculado");
    expect(calc.results.error_before_adjustment).toBeNull();
    expect(calc.results.calculation_memory.errorBeforeAdjustment).toBeNull();
  });

  test("com ajuste — calcula erro antes do ajuste", () => {
    const calc = calculateCalibrationPoint(
      {
        nominal_value: "200",
        reading1: "200",
        reading2: "200",
        reading3: "200",
        reading_before_adjustment: "200.05",
      },
      {
        resolution: "0.0001",
        unit: "g",
        referenceValue: 200,
        adjustmentPerformed: true,
      },
    );
    expect(calc.results.error_before_adjustment).toBeCloseTo(0.05, 4);
  });

  test("incomplete point stays pending", () => {
    const calc = calculateCalibrationPoint({ nominal_value: "", reading1: "" }, { resolution: "0.01" });
    expect(calc.calcStatus).toBe("pendente");
  });

  test("readings_after array with 6 leituras", () => {
    const calc = calculateCalibrationPoint(
      {
        nominal_value: "5000",
        readings_after: ["5000", "5000.1", "5000.2", "5000.1", "5000", "5000.1"],
      },
      { resolution: "0.1", unit: "g", up: 0.05, ud: 0, ue: 0 },
    );
    expect(calc.calcStatus).toBe("calculado");
    expect(calc.results.average_reading).toBeCloseTo(5000.0833, 2);
  });

  test("menos de 3 leituras depois: erro", () => {
    const calc = calculateCalibrationPoint(
      { nominal_value: "5", readings_after: ["5.01", "5.02"] },
      { resolution: "0.01", unit: "g" },
    );
    expect(calc.calcStatus).toBe("erro");
  });

  test("standardUncertaintyUp = RSS(Ue/k) sem /sqrt(3)", () => {
    const items = [{
      id: "w1",
      identification: "P-22",
      expanded_uncertainty: "0,4",
      coverage_factor: "2",
      weight_status: "1",
      unit: "g",
    }];
    const r = standardUncertaintyUpFromWeightIds(["w1"], items, "g");
    expect(r.valid).toBe(true);
    expect(r.value).toBeCloseTo(0.2, 4);
  });

  test("driftUncertaintyUd = |deriva|/sqrt(3)", () => {
    const items = [{
      id: "w1",
      identification: "P-23",
      expanded_uncertainty: "0,2",
      conventional_value: "5000",
      previous_conventional_value: "5001",
      weight_status: "2",
      unit: "g",
    }];
    const r = driftUncertaintyUdFromWeightIds(["w1"], items, "g");
    expect(r.valid).toBe(true);
    expect(r.value).toBeCloseTo(1 / Math.sqrt(3), 4);
  });

  test("Welch-Satterthwaite só considera ua", () => {
    const nu = welchSatterthwaiteNuEff([
      { type: "ua", u: 0.001, nu: 2 },
      { type: "up", u: 0.0002, nu: Infinity },
    ]);
    // uc inclui up; denominador só ua⁴/(n−1) — PR-7.6 §5.3.6
    expect(nu).toBeCloseTo(2.16, 1);
  });

  test("ua=0 → Veff sentinela 100 (Excel) → k=2 → exibição ∞", () => {
    const nuRaw = welchSatterthwaiteNuEff([{ type: "up", u: 0.0002, nu: Infinity }]);
    expect(nuRaw).toBe(Infinity);
    const nu = truncateVeff(nuRaw);
    expect(nu).toBe(100);
    expect(coverageFactorFromNu(nu)).toBe(2);
  });

  test("coverageFactorFromNu nu=6 ≈ 2,52 (002/2025)", () => {
    expect(coverageFactorFromNu(6)).toBeCloseTo(2.52, 2);
  });

  test("veffForDbStorage persiste 100 para ∞ (PostgreSQL numeric)", () => {
    expect(VEFF_INFINITE_SENTINEL).toBe(100);
    expect(veffForDbStorage(Infinity)).toBe(100);
    expect(veffForDbStorage(150)).toBe(100);
    expect(veffForDbStorage(6.36)).toBe(6);
  });

  test("resolveReadingsAfter fallback legado", () => {
    expect(resolveReadingsAfter({ reading1: "1", reading2: "2", reading3: "3" })).toEqual(["1", "2", "3"]);
  });

  test("VCC correction when air density out of range", () => {
    expect(shouldApplyVccCorrection(1.05)).toBe(true);
    const vcc = correctConventionalMassForBuoyancy(210, 1.05, 7900);
    expect(vcc).not.toBe(210);
  });

  test("determineInstrumentClass for commercial scale", () => {
    const cls = determineInstrumentClass("30", "0.01", "kg");
    expect(cls.valid).toBe(true);
    expect(["I", "II", "III"]).toContain(cls.instrumentClass);
  });

  test("evaluatePointConformity", () => {
    const tol = calculateToleranceOiml("III", "1000", "g");
    const ev = evaluatePointConformity(0.5, 0.1, tol.positive, tol.negative);
    expect(ev.result).toBe("conforme");
  });

  test("RE-7.2B roundExpandedUncertainty — Validação 210 g", () => {
    expect(roundExpandedUncertainty(0.00062, "0.0001", 4)).toBe(0.0007);
  });

  test("PR-7.8 roundIndicationError within half resolution", () => {
    expect(roundIndicationError(0.00004, "0.0001", 4)).toBe(0);
  });

  test("resolveResolutionForNominal — balança multi-escala (5/10/30 kg)", () => {
    const balance = {
      unidade: "kg",
      capacidade: "5",
      resolucao: "0,005",
      capacidade_2: "10",
      resolucao_2: "0,01",
      capacidade_3: "30",
      resolucao_3: "0,1",
    };
    expect(resolveResolutionForNominal("3", balance, "kg")).toBe("0,005");
    expect(resolveResolutionForNominal("7", balance, "kg")).toBe("0,01");
    expect(resolveResolutionForNominal("25", balance, "kg")).toBe("0,1");
    expect(resolveResolutionForNominal("35", balance, "kg")).toBe("0,1");
    expect(decimalPlacesFromResolution(resolveResolutionForNominal("3", balance, "kg"))).toBe(3);
    expect(decimalPlacesFromResolution(resolveResolutionForNominal("7", balance, "kg"))).toBe(2);
    expect(decimalPlacesFromResolution(resolveResolutionForNominal("25", balance, "kg"))).toBe(1);
  });
});

describe("buoyancyCalculations", () => {
  test("calculateBuoyancyUncertainty produces ue for valid environmental", () => {
    const res = calculateBuoyancyUncertainty({
      conventionalMass: 210,
      materialDensity: 7900,
      environmental: {
        initial_temperature: "24",
        final_temperature: "24",
        initial_humidity: "65",
        final_humidity: "58",
        initial_pressure: "935",
        final_pressure: "935",
      },
    });
    expect(res.valid).toBe(true);
    expect(res.ue).toBeGreaterThan(0);
    expect(res.ue).toBeLessThan(0.001);
  });

  test("ue = V.C × Urel — usa V.C agregado, não V.R. após VCC (EMP.P1)", () => {
    const environmental = {
      initial_temperature: "24",
      final_temperature: "23",
      initial_humidity: "65",
      final_humidity: "55",
      initial_pressure: "935",
      final_pressure: "935",
      balance_adjusted: "nao",
    };
    const [pt] = calculateCertificatePoints(
      [{
        point_number: 1,
        nominal_value: "200",
        material_density: "7900",
        resolution: "0.0001",
        reading1: "200",
        reading2: "200",
        reading3: "200",
      }],
      { unidade: "g", resolucao: "0.0001", decimal_places: { p1: 4 } },
      [],
      [],
      environmental,
    );
    const emp = calculateBuoyancyUncertainty({
      conventionalMass: 200,
      materialDensity: 7900,
      environmental,
    });
    expect(pt.calculation_memory.vc_uncorrected).toBe(200);
    expect(pt.calculation_memory.empConventionalMass).toBe(200);
    expect(pt.buoyancy_uncertainty ?? pt.calculation_memory?.ue).toBeDefined();
    const ue = pt.buoyancy_uncertainty ?? pt.calculation_memory.ue;
    expect(ue).toBeCloseTo(emp.ue, 8);
    expect(ue / 200).toBeCloseTo(emp.urel, 10);
    expect(ue).toBeCloseTo(200 * emp.urel, 8);
  });
});
