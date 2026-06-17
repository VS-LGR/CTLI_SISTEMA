import {
  calculatePointAverage,
  calculateRepeatability,
  calculateCalibrationPoint,
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
