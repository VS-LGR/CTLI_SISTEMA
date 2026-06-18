import {
  sumConventionalFromWeightIds,
  combinedExpandedUncertaintyFromWeightIds,
  environmentalAverage,
  environmentalUncertainty,
  ENV_UNCERTAINTY_CONSTANTS,
} from "./environmentalCalculations";

describe("environmentalCalculations", () => {
  const weights = [
    { id: "w1", nominal_value: "100", conventional_value: "100.0002", expanded_uncertainty: "0.0005", unit: "g" },
    { id: "w2", nominal_value: "50", conventional_value: "50.0001", expanded_uncertainty: "0.0003", unit: "g" },
  ];

  test("sumConventionalFromWeightIds usa VVC", () => {
    const sum = sumConventionalFromWeightIds(["w1", "w2"], weights, "g");
    expect(sum.valid).toBe(true);
    expect(sum.value).toBeCloseTo(150.0003, 4);
  });

  test("combinedExpandedUncertaintyFromWeightIds combina Ue (RSS)", () => {
    const ue = combinedExpandedUncertaintyFromWeightIds(["w1", "w2"], weights, "g");
    expect(ue.valid).toBe(true);
    expect(ue.value).toBeCloseTo(Math.sqrt(0.0005 ** 2 + 0.0003 ** 2), 6);
  });

  test("environmentalAverage e incerteza conforme planilha PREENCHER", () => {
    expect(environmentalAverage("22.0", "24.0")).toBe(23);
    expect(environmentalUncertainty("22.0", "24.0", ENV_UNCERTAINTY_CONSTANTS.temperature)).toBe(1.5);
    expect(environmentalUncertainty("50", "56", ENV_UNCERTAINTY_CONSTANTS.humidity)).toBe(6);
    expect(environmentalUncertainty("920", "924", ENV_UNCERTAINTY_CONSTANTS.pressure)).toBe(4);
  });
});
