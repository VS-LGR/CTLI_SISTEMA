import {
  roundExpandedUncertainty,
  roundIndicationError,
  formatVeffForDisplay,
} from "./certificateDisplayRounding";

describe("certificateDisplayRounding — PR-7.8", () => {
  test("Ue mínima = resolução d", () => {
    expect(roundExpandedUncertainty(0.00003, "0.0001", 4)).toBe(0.0001);
  });

  test("|E| ≤ d/2 → 0", () => {
    expect(roundIndicationError(0.00004, "0.0001", 4)).toBe(0);
  });

  test("|E| > d/2 → ±d", () => {
    expect(roundIndicationError(0.00008, "0.0001", 4)).toBe(0.0001);
    expect(roundIndicationError(-0.00008, "0.0001", 4)).toBe(-0.0001);
  });

  test("formatVeffForDisplay trunca e limita", () => {
    expect(formatVeffForDisplay(6.36)).toBe("6");
    expect(formatVeffForDisplay(Infinity)).toBe("100");
    expect(formatVeffForDisplay(150)).toBe("100");
  });
});
