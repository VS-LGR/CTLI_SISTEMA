import {
  mround,
  roundExpandedUncertainty,
  roundIndicationError,
  roundIndicationErrorFromRoundedInputs,
  roundReferenceForDisplay,
  roundAverageForDisplay,
  formatVeffForDisplay,
  buildCertificatePointDisplay,
} from "./certificateDisplayRounding";

describe("certificateDisplayRounding — RE-7.2B Certificado-RBC", () => {
  test("mround alinha com Excel para resolução 0,0001 g", () => {
    expect(mround(0.000666402, 0.0001)).toBe(0.0007);
    expect(mround(0.000622, 0.0001)).toBe(0.0006);
  });

  test("Ue exibida — Validação 2025/2026 (0,000622 → 0,0007)", () => {
    expect(roundExpandedUncertainty(0.000622, "0.0001", 4)).toBe(0.0007);
    expect(roundExpandedUncertainty(0.000625161, "0.0001", 4)).toBe(0.0007);
  });

  test("Ue mínima = resolução d antes do ajuste MROUND", () => {
    expect(roundExpandedUncertainty(0.00003, "0.0001", 4)).toBe(0.0001);
  });

  test("E exibido = MROUND(média,d) − MROUND(V.R.,d)", () => {
    expect(roundIndicationErrorFromRoundedInputs(210.0001, 210.0001, "0.0001", 4)).toBe(0);
    expect(roundIndicationErrorFromRoundedInputs(210.0001, 210, "0.0001", 4)).toBe(0.0001);
  });

  test("V.R. e média exibidos com MROUND", () => {
    expect(roundReferenceForDisplay(210.0001, "0.0001", 4)).toBe(210.0001);
    expect(roundAverageForDisplay(210.0001, "0.0001", 4)).toBe(210.0001);
  });

  test("roundIndicationError legado — NIT-DICLA-021 sobre E bruto", () => {
    expect(roundIndicationError(0.00004, "0.0001", 4)).toBe(0);
    expect(roundIndicationError(0.00008, "0.0001", 4)).toBe(0.0001);
  });

  test("formatVeffForDisplay — Certificado-RBC AA49", () => {
    expect(formatVeffForDisplay(6.36)).toBe("6");
    expect(formatVeffForDisplay(Infinity)).toBe("∞");
    expect(formatVeffForDisplay(100)).toBe("∞");
    expect(formatVeffForDisplay(150)).toBe("∞");
  });

  test("buildCertificatePointDisplay — ponto Validação", () => {
    const display = buildCertificatePointDisplay(
      {
        nominal_value: 210.0001,
        average_reading: 210.0001,
        indication_error: 0,
        expanded_uncertainty: 0.000622,
        degrees_of_freedom: 100,
        resolution: "0.0001",
        display_decimals: 4,
      },
      { unidade: "g", resolucao: "0.0001" },
      "g",
    );
    expect(display.reference).toBe(210.0001);
    expect(display.average).toBe(210.0001);
    expect(display.indicationError).toBe(0);
    expect(display.expandedUncertainty).toBe(0.0007);
    expect(display.veff).toBe("∞");
  });
});
