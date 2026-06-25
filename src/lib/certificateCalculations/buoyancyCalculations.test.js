import {
  calculateBuoyancyUncertainty,
  calculateBuoyancyUncertaintyFromPpm,
} from "./buoyancyCalculations";

describe("buoyancyCalculations", () => {
  test("EMP.P1 — Validação 2025 ue ≈ 0,000051763", () => {
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
    expect(res.method).toBe("emp");
    expect(res.ue).toBeCloseTo(0.000051763, 5);
  });

  test("PPM fallback — aço 1 ppm", () => {
    const res = calculateBuoyancyUncertaintyFromPpm(1000, 1);
    expect(res.valid).toBe(true);
    expect(res.ue).toBeCloseTo((1000 * 1e-6) / Math.sqrt(3), 8);
  });

  test("EMP.P1 requer ambientais completos", () => {
    const res = calculateBuoyancyUncertainty({
      conventionalMass: 100,
      materialDensity: 7900,
      environmental: {},
    });
    expect(res.valid).toBe(false);
    expect(res.needsFallback).toBe(true);
  });
});
