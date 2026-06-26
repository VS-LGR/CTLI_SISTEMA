import { buildPointCalculationTrace } from "./calculationTrace";

describe("buildPointCalculationTrace", () => {
  test("gera passos com fórmulas e operandos", () => {
    const point = {
      point_number: 1,
      calc_status: "calculado",
      calculation_memory: {
        average: 210.0001,
        referenceValue: 210,
        indicationError: 0.0001,
        ua: 0,
        up: 0.0002,
        ud: 0.0002309,
        ue: 0.000051763,
        ur: 0.000029,
        combinedUncertainty: 0.000311,
        coverageFactor: 2,
        expandedUncertainty: 0.000622,
        expandedUncertaintyDisplay: 0.0007,
        degreesOfFreedom: 100,
        veffDisplay: "∞",
        resolution: "0.0001",
        buoyancy_method: "ppm",
        ppmEffective: 1,
        readingCount: 3,
        calculationTrace: [],
      },
    };
    const { steps } = buildPointCalculationTrace(point, { unidade: "g" }, "g");
    expect(steps.length).toBeGreaterThan(5);
    expect(steps.some((s) => s.id === "uc")).toBe(true);
    expect(steps.some((s) => s.id === "U_display")).toBe(true);
    const uDisplay = steps.find((s) => s.id === "U_display");
    expect(uDisplay.formula).toBe("MROUND(Ue + (d/10)×4,4, d)");
    expect(uDisplay.expression).toMatch(/0\.000044/);
    expect(uDisplay.result).toBe(0.0007);
    const ucStep = steps.find((s) => s.id === "uc");
    expect(ucStep.expression).toMatch(/√\(/);
  });
});
