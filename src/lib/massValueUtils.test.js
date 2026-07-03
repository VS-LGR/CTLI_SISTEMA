import {
  convertMassValue,
  formatMassDisplay,
  parseLegacyMassString,
  sanitizeMassNumericInput,
} from "./massValueUtils";

describe("sanitizeMassNumericInput", () => {
  it("keeps digits and one decimal separator", () => {
    expect(sanitizeMassNumericInput("12,5 kg")).toBe("12,5");
    expect(sanitizeMassNumericInput("abc1.2.3")).toBe("1.23");
  });
});

describe("parseLegacyMassString", () => {
  it("parses value with unit", () => {
    expect(parseLegacyMassString("1000 g")).toEqual({ valor: "1000", unidade: "g" });
  });

  it("parses plain number with default unit", () => {
    expect(parseLegacyMassString("15", "kg")).toEqual({ valor: "15", unidade: "kg" });
  });
});

describe("formatMassDisplay", () => {
  it("formats value and unit", () => {
    expect(formatMassDisplay("100", "g")).toBe("100 g");
  });

  it("returns fallback when empty", () => {
    expect(formatMassDisplay("", "g")).toBe("—");
  });
});

describe("convertMassValue", () => {
  it("converts between g, kg and mg", () => {
    expect(convertMassValue("1000", "g", "kg")).toBeCloseTo(1, 10);
    expect(convertMassValue("1,5", "kg", "g")).toBeCloseTo(1500, 10);
    expect(convertMassValue("250", "mg", "g")).toBeCloseTo(0.25, 10);
  });
});
