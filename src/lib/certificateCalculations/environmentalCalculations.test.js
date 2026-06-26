import {
  sumConventionalFromWeightIds,
  combinedExpandedUncertaintyFromWeightIds,
  environmentalAverage,
  environmentalUncertainty,
  calculateAirDensity,
  calculateAirDensityFromEnvironmental,
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

  test("sumConventionalFromWeightIds com vccCorrection=false não aplica VCC por peso", () => {
    const sum = sumConventionalFromWeightIds(
      ["w1"],
      [{ id: "w1", conventional_value: "210", unit: "g" }],
      "g",
      { airDensity: 1.05, materialDensity: 7900, vccCorrection: true },
    );
    const raw = sumConventionalFromWeightIds(
      ["w1"],
      [{ id: "w1", conventional_value: "210", unit: "g" }],
      "g",
      { vccCorrection: false },
    );
    expect(raw.value).toBe(210);
    expect(sum.value).not.toBe(210);
  });

  test("combinedExpandedUncertaintyFromWeightIds combina Ue (RSS)", () => {
    const ue = combinedExpandedUncertaintyFromWeightIds(["w1", "w2"], weights, "g");
    expect(ue.valid).toBe(true);
    expect(ue.value).toBeCloseTo(Math.sqrt(0.0005 ** 2 + 0.0003 ** 2), 6);
  });

  test("environmentalAverage e incerteza conforme planilha PREENCHER", () => {
    expect(environmentalAverage("22.0", "24.0")).toBe(23);
    expect(environmentalUncertainty("22.0", "24.0", ENV_UNCERTAINTY_CONSTANTS.temperature)).toBe(1);
    expect(environmentalUncertainty("50", "56", ENV_UNCERTAINTY_CONSTANTS.humidity)).toBe(6);
    expect(environmentalUncertainty("920", "924", ENV_UNCERTAINTY_CONSTANTS.pressure)).toBe(4);
  });

  test("calculateAirDensity — golden EmissãoTeste (T=20,5 UR=50,5 P=950,5 → 1,12)", () => {
    const result = calculateAirDensity(20.5, 50.5, 950.5);
    expect(result.valid).toBe(true);
    expect(result.value).toBe(1.12);
  });

  test("calculateAirDensityFromEnvironmental usa médias inicial/final", () => {
    const result = calculateAirDensityFromEnvironmental({
      initial_temperature: "20",
      final_temperature: "21",
      initial_humidity: "50",
      final_humidity: "51",
      initial_pressure: "950",
      final_pressure: "951",
    });
    expect(result.valid).toBe(true);
    expect(result.value).toBeCloseTo(1.12, 1);
  });
});
