import { describeWeightComposition } from "./pointCalculations";
import {
  isOimlNominalValue,
  oimlNominalHint,
  oimlNominalsForUnit,
} from "../oimlR111NominalValues";

describe("describeWeightComposition", () => {
  const items = [
    { id: "w100", nominal_value: "100", unit: "g", identification: "100g" },
    { id: "w50a", nominal_value: "50", unit: "g", identification: "50g-A" },
    { id: "w50b", nominal_value: "50", unit: "g", identification: "50g-B" },
  ];

  test("soma V.N. de múltiplos pesos", () => {
    const c = describeWeightComposition(["w100", "w50a", "w50b"], items, { targetUnit: "g" });
    expect(c.valid).toBe(true);
    expect(c.total).toBeCloseTo(200, 6);
    expect(c.compositionDisplay).toBe("100 g + 50 g + 50 g");
    expect(c.display).toBe("100 g + 50 g + 50 g = 200 g");
  });

  test("peso único", () => {
    const c = describeWeightComposition(["w100"], items, { targetUnit: "g" });
    expect(c.display).toBe("100 g");
  });
});

describe("oimlR111NominalValues", () => {
  test("série g inclui 200", () => {
    expect(oimlNominalsForUnit("g")).toContain(200);
  });

  test("isOimlNominalValue aceita 50 g", () => {
    expect(isOimlNominalValue("50", "g")).toBe(true);
  });

  test("hint para valor fora da série", () => {
    expect(oimlNominalHint("200.5", "g")).toContain("200");
  });
});
