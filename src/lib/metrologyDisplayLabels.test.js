import { expandDisplayLabel, tooltipLabelForText } from "./metrologyDisplayLabels";

describe("metrologyDisplayLabels", () => {
  test("expandDisplayLabel expande abreviações conhecidas", () => {
    expect(expandDisplayLabel("Termo-baro")).toBe("Termo-baro-higrômetro");
    expect(expandDisplayLabel("V.N.")).toBe("Valor nominal");
    expect(expandDisplayLabel("Cliente ABC")).toBe("Cliente ABC");
  });

  test("tooltipLabelForText retorna texto expandido", () => {
    expect(tooltipLabelForText("TBH")).toBe("Termo-baro-higrômetro");
  });
});
