import {
  calculateStandardDrift,
  driftFromWeightItem,
  formatWeightStatus,
} from "@/lib/standardWeightCalculations";

describe("calculateStandardDrift", () => {
  test("1ª calibração: deriva = Ue", () => {
    const r = calculateStandardDrift({
      weightStatus: "1",
      expandedUncertainty: "0,1",
      conventionalValue: "5001",
      previousConventionalValue: "",
    });
    expect(r.valid).toBe(true);
    expect(r.value).toBeCloseTo(0.1);
  });

  test("2ª calibração: deriva = VVC − VVC anterior", () => {
    const r = calculateStandardDrift({
      weightStatus: "2",
      expandedUncertainty: "0,2",
      conventionalValue: "5000",
      previousConventionalValue: "5001",
    });
    expect(r.valid).toBe(true);
    expect(r.value).toBeCloseTo(-1);
  });

  test("2ª calibração sem VVC anterior: inválido", () => {
    const r = calculateStandardDrift({
      weightStatus: "2",
      expandedUncertainty: "0,2",
      conventionalValue: "5000",
      previousConventionalValue: "",
    });
    expect(r.valid).toBe(false);
  });

  test("1ª calibração sem Ue: inválido", () => {
    const r = calculateStandardDrift({
      weightStatus: "1",
      expandedUncertainty: "",
      conventionalValue: "5000",
      previousConventionalValue: "",
    });
    expect(r.valid).toBe(false);
  });
});

describe("driftFromWeightItem", () => {
  test("calcula deriva a partir do item cadastrado", () => {
    const d = driftFromWeightItem({
      weight_status: "1",
      expanded_uncertainty: "0,1",
      conventional_value: "5001",
      standard_drift: "",
    });
    expect(d.valid).toBe(true);
    expect(d.value).toBeCloseTo(0.1);
  });
});

describe("formatWeightStatus", () => {
  test("formata 1º e 2º", () => {
    expect(formatWeightStatus("1")).toBe("1º");
    expect(formatWeightStatus("2")).toBe("2º");
    expect(formatWeightStatus("")).toBe("—");
  });
});
