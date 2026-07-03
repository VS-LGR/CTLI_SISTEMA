import {
  mround,
  roundExpandedUncertainty,
  roundIndicationError,
  roundIndicationErrorFromRoundedInputs,
  roundReferenceForDisplay,
  roundAverageForDisplay,
  formatVeffForDisplay,
  resolvePointVeff,
  resolvePointVeffRaw,
  enrichCertificatePointsForDisplay,
  buildCertificatePointDisplay,
  resolveCertificateResolution,
} from "./certificateDisplayRounding";

describe("certificateDisplayRounding — RE-7.2B Certificado-RBC", () => {
  test("mround alinha com Excel para resolução 0,0001 g", () => {
    expect(mround(0.000666402, 0.0001)).toBe(0.0007);
    expect(mround(0.000622, 0.0001)).toBe(0.0006);
  });

  test("Ue exibida — Validação 2025/2026 (0,000622 → 0,0007)", () => {
    expect(roundExpandedUncertainty(0.000622, "0.0001", 4)).toBe(0.0007);
    expect(roundExpandedUncertainty(0.000623, "0.0001", 4)).toBe(0.0007);
    expect(roundExpandedUncertainty(0.000625161, "0.0001", 4)).toBe(0.0007);
  });

  test("Ue exibida — fator (d/10)×4,4 com d = resolução 0,0001", () => {
    const ue = 0.000623;
    const d = 0.0001;
    const factor = (d / 10) * 4.4;
    expect(factor).toBeCloseTo(0.000044, 10);
    expect(roundExpandedUncertainty(ue, String(d), 4)).toBe(0.0007);
  });

  test("Ue exibida — Ue baixa arredonda ao múltiplo d (sem max(Ue,d))", () => {
    expect(roundExpandedUncertainty(0.00003, "0.0001", 4)).toBe(0.0001);
  });

  test("resolveCertificateResolution — ignora divisão de verificação gravada como resolução", () => {
    const balance = { unidade: "g", resolucao: "0.0001" };
    const point = {
      nominal_value: 210,
      resolution: "0.000025",
      verification_division: "0.000025",
      calculation_memory: { resolution: "0.0001" },
    };
    expect(resolveCertificateResolution(point, balance, "g", { preferMemory: true })).toBe("0.0001");
    expect(resolveCertificateResolution(point, balance, "g", { preferMemory: false })).toBe("0.0001");
  });

  test("resolveCertificateResolution — ignora meia resolução gravada por recálculo anterior", () => {
    const balance = { unidade: "g", resolucao: "0.0001" };
    const point = {
      nominal_value: 210,
      resolution: "0.00005",
      calculation_memory: { resolution: "0.0001" },
    };
    expect(resolveCertificateResolution(point, balance, "g", { preferMemory: false })).toBe("0.0001");
  });

  test("buildCertificatePointDisplay — usa resolução da balança quando ponto tem divisão de verificação", () => {
    const display = buildCertificatePointDisplay(
      {
        nominal_value: 210.0001,
        average_reading: 210.0001,
        expanded_uncertainty: 0.000623,
        resolution: "0.000025",
        verification_division: "0.000025",
        calculation_memory: { resolution: "0.0001" },
        display_decimals: 4,
      },
      { unidade: "g", resolucao: "0.0001" },
      "g",
    );
    expect(display.resolution).toBe("0.0001");
    expect(display.expandedUncertainty).toBe(0.0007);
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

  test("resolvePointVeff — recomposição Welch quando degrees_of_freedom ausente (Matriz col 34 = 100)", () => {
    const point = {
      calc_status: "calculado",
      degrees_of_freedom: null,
      repeatability: 0,
      calculation_memory: {
        ua: 0,
        up: 0.0002,
        ud: 0.00023094010767585034,
        ue: 5.9497292286384904e-05,
        ur: 2.8867513459481293e-05,
        upLC: 0,
        readingCount: 3,
      },
    };
    expect(resolvePointVeffRaw(point)).toBe(100);
    expect(resolvePointVeff(point)).toBe("∞");
  });

  test("enrichCertificatePointsForDisplay — cert 5/2026 cenário DB sem Veff", () => {
    const cert = enrichCertificatePointsForDisplay({
      certificate_number: 5,
      certificate_year: 2026,
      points: [{
        point_number: 1,
        calc_status: "calculado",
        nominal_value: 210.0001,
        average_reading: 210.0001,
        expanded_uncertainty: 0.0006251610815016501,
        coverage_factor: 2,
        repeatability: 0,
        resolution: "0.0001",
        calculation_memory: {
          ua: 0,
          up: 0.0002,
          ud: 0.00023094010767585034,
          ue: 5.9497292286384904e-05,
          ur: 2.8867513459481293e-05,
          upLC: 0,
          readingCount: 3,
        },
      }],
    });
    expect(cert.points[0].degrees_of_freedom).toBe(100);
  });
});
