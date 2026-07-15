import {
  calculateWeightItem,
  airDensity,
  buoyancyCorrFactor,
  lookupClassUncertainty,
  lookupMpeMg,
} from "./index";

function p1Cycles() {
  return [
    { standard_reading: "2000", measuring_reading: "2000" },
    { standard_reading: "2000", measuring_reading: "2000" },
    { standard_reading: "2000", measuring_reading: "2000" },
  ];
}

function p2Cycles() {
  return [
    { standard_reading: "5000.0045", measuring_reading: "5000.01" },
    { standard_reading: "5000.0045", measuring_reading: "5000.01" },
    { standard_reading: "5000.0045", measuring_reading: "5000.01" },
  ];
}

describe("weightCalibrationCalculations", () => {
  test("airDensity matches P1 ambient (20.8 °C, 58.7 %, 927.1 hPa)", () => {
    const da = airDensity(20.8, 58.7, 927.1);
    expect(da).toBeCloseTo(1.09261363, 6);
  });

  test("buoyancyCorrFactor matches P1 Inox", () => {
    const da = airDensity(20.8, 58.7, 927.1);
    const f = buoyancyCorrFactor(da, 7950, 8000);
    expect(f).toBeCloseTo(0.9999999155768, 12);
  });

  test("lookupClassUncertainty / MPE for 2000 g F1", () => {
    expect(lookupMpeMg(2000, "F1")).toBe(10);
    expect(lookupClassUncertainty(2000, "F1", "g")).toBeCloseTo(0.003333333, 6);
  });

  test("lookupClassUncertainty for 5000 g M1", () => {
    expect(lookupClassUncertainty(5000, "M1", "g")).toBeCloseTo(0.083333333, 6);
  });

  test("P1 golden: 2000 g F1 Inox/Inox, ciclos iguais", () => {
    const res = calculateWeightItem({
      nominal_value: 2000,
      nominal_unit: "g",
      reference_conventional_value: 2000.0012,
      reference_uncertainty: 0.001,
      reference_material: "Inox",
      uut_material: "Inox",
      uut_class: "F1",
      balance_resolution: 0.01,
      decimal_places: 4,
      cycle_count: 3,
      ambient_temp: 20.8,
      ambient_humidity: 58.7,
      ambient_pressure: 927.1,
      cycles: p1Cycles(),
      closing_standard_reading: 2000,
      assume_class_uncertainty: true,
    });

    expect(res.calc_status).toBe("calculado");
    expect(res.airDensity).toBeCloseTo(1.09261363, 5);
    expect(res.conventionalValue).toBeCloseTo(2000.0012, 6);
    expect(res.deviation).toBeCloseTo(0.0012, 6);
    expect(res.expandedUncertainty).toBeCloseTo(0.00641, 4);
    expect(res.roundedUncertainty).toBeCloseTo(0.0065, 4);
    expect(res.classUncertainty).toBeCloseTo(0.0033, 4);
    expect(res.usedUncertainty).toBeCloseTo(0.0033, 4);
    expect(res.coverageFactor).toBeCloseTo(2.0, 2);
    expect(res.approved).toBe(true);
    expect(res.conformity_result).toBe("conforme");
  });

  test("P1 without assume class uses rounded calculated U", () => {
    const res = calculateWeightItem({
      nominal_value: 2000,
      nominal_unit: "g",
      reference_conventional_value: 2000.0012,
      reference_uncertainty: 0.001,
      reference_material: "Inox",
      uut_material: "Inox",
      uut_class: "F1",
      balance_resolution: 0.01,
      decimal_places: 4,
      cycle_count: 3,
      ambient_temp: 20.8,
      ambient_humidity: 58.7,
      ambient_pressure: 927.1,
      cycles: p1Cycles(),
      closing_standard_reading: 2000,
      assume_class_uncertainty: false,
    });

    expect(res.usedUncertainty).toBeCloseTo(0.0065, 4);
  });

  test("P2 golden: 5000 g M1 Ferro Fundido", () => {
    const res = calculateWeightItem({
      nominal_value: 5000,
      nominal_unit: "g",
      reference_conventional_value: 5000.0045,
      reference_uncertainty: 0.008,
      reference_material: "Inox",
      uut_material: "Ferro Fundido",
      uut_class: "M1",
      balance_resolution: 0.01,
      decimal_places: 2,
      cycle_count: 3,
      ambient_temp: 23.5,
      ambient_humidity: 50,
      ambient_pressure: 950,
      cycles: p2Cycles(),
      closing_standard_reading: 5000.0045,
      assume_class_uncertainty: true,
    });

    expect(res.calc_status).toBe("calculado");
    expect(res.conventionalValue).toBeCloseTo(5000.01, 4);
    expect(res.classUncertainty).toBeCloseTo(0.08, 2);
    expect(res.usedUncertainty).toBeCloseTo(0.08, 2);
    expect(res.roundedUncertainty).toBeCloseTo(0.02, 2);
    expect(res.approved).toBe(true);
  });
});
