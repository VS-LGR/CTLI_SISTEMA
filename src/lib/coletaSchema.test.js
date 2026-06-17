import { nominalFromWeightIds } from "./coletaSchema";

describe("nominalFromWeightIds", () => {
  const items = [
    { id: "w1", nominal_value: "500", unit: "g" },
    { id: "w2", nominal_value: "1", unit: "kg" },
    { id: "w3", nominal_value: "500", unit: "g" },
  ];

  it("retorna string vazia sem ids", () => {
    expect(nominalFromWeightIds([], items)).toBe("");
    expect(nominalFromWeightIds(["w1"], [])).toBe("");
  });

  it("soma pesos com mesma unidade", () => {
    expect(nominalFromWeightIds(["w1", "w3"], items)).toBe("1000 g");
  });

  it("concatena pesos com unidades diferentes", () => {
    expect(nominalFromWeightIds(["w1", "w2"], items)).toBe("500 g + 1 kg");
  });

  it("aceita vírgula decimal", () => {
    const decimalItems = [{ id: "d1", nominal_value: "1,5", unit: "kg" }];
    expect(nominalFromWeightIds(["d1"], decimalItems)).toBe("1.5 kg");
  });
});
