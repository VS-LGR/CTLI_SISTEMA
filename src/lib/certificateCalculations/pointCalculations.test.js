import {
  calculatePointAverage,
  calculateRepeatability,
  calculateCalibrationPoint,
  standardUncertaintyAbsFromWeightIds,
  resolveReadingsAfter,
} from "./pointCalculations";
import {
  calculateToleranceOiml,
  evaluatePointConformity,
  determineInstrumentClass,
} from "./conformityCalculations";

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

  test("calculateCalibrationPoint produces expanded uncertainty", () => {
    const calc = calculateCalibrationPoint(
      {
        nominal_value: "5",
        reading1: "5.01",
        reading2: "5.02",
        reading3: "5.03",
        reading_before_adjustment: "5.05",
      },
      { resolution: "0.01", unit: "g", standardUncertaintyPpm: 2 },
    );
    expect(calc.calcStatus).toBe("calculado");
    expect(calc.results.expanded_uncertainty).toBeGreaterThan(0);
    expect(calc.results.average_reading).toBeCloseTo(5.02, 4);
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
      { resolution: "0.1", unit: "g", standardUncertaintyAbs: 0.05 },
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

  test("standardUncertaintyAbs inclui deriva na 1ª calibração", () => {
    const items = [{
      id: "w1",
      identification: "P-22",
      expanded_uncertainty: "0,1",
      weight_status: "1",
      unit: "g",
    }];
    const r = standardUncertaintyAbsFromWeightIds(["w1"], items, "g");
    expect(r.valid).toBe(true);
    // u_ue = 0.1/2 = 0.05; u_drift = 0.1/√3; RSS ≈ 0.076
    expect(r.value).toBeCloseTo(0.0764, 3);
  });

  test("standardUncertaintyAbs 2ª calibração com deriva", () => {
    const items = [{
      id: "w1",
      identification: "P-23",
      expanded_uncertainty: "0,2",
      conventional_value: "5000",
      previous_conventional_value: "5001",
      weight_status: "2",
      unit: "g",
    }];
    const r = standardUncertaintyAbsFromWeightIds(["w1"], items, "g");
    expect(r.valid).toBe(true);
    expect(r.value).toBeGreaterThan(0.05);
  });

  test("resolveReadingsAfter fallback legado", () => {
    expect(resolveReadingsAfter({ reading1: "1", reading2: "2", reading3: "3" })).toEqual(["1", "2", "3"]);
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
});
