import {
  evaluateCertificateMaxTolerance,
  evaluatePointMaxTolerance,
  generalMaxToleranceResult,
  normalizePointMaxTolerances,
  toleranceMapFromRaw,
} from "./pointMaxToleranceVerification";

describe("pointMaxToleranceVerification", () => {
  test("normalizePointMaxTolerances deduplica e ordena", () => {
    const raw = [{ point: 2, value: "0,1" }, { point: 1, value: "0,05" }, { point: 2, value: "0,2" }];
    expect(normalizePointMaxTolerances(raw)).toEqual([
      { point: 1, value: "0,05" },
      { point: 2, value: "0,2" },
    ]);
  });

  test("evaluatePointMaxTolerance — dentro do limite", () => {
    const r = evaluatePointMaxTolerance(0.02, 0.01, 0.05);
    expect(r.result).toBe("aprovado");
    expect(r.testValue).toBeCloseTo(0.03, 6);
  });

  test("evaluatePointMaxTolerance — |E+U| com erro negativo", () => {
    const r = evaluatePointMaxTolerance(-0.04, 0.02, 0.05);
    expect(r.testValue).toBeCloseTo(0.02, 6);
    expect(r.result).toBe("aprovado");
  });

  test("evaluatePointMaxTolerance — alerta acima da tolerância", () => {
    const r = evaluatePointMaxTolerance(0.08, 0.05, 0.1);
    expect(r.testValue).toBeCloseTo(0.13, 6);
    expect(r.result).toBe("alerta");
  });

  test("evaluatePointMaxTolerance — incerteza ausente", () => {
    const r = evaluatePointMaxTolerance(0.01, "", 0.05);
    expect(r.result).toBe("nao_avaliado");
  });

  test("generalMaxToleranceResult", () => {
    expect(generalMaxToleranceResult([
      { result: "aprovado" },
      { result: "aprovado" },
    ])).toBe("aprovado");
    expect(generalMaxToleranceResult([
      { result: "aprovado" },
      { result: "alerta" },
    ])).toBe("alerta");
    expect(generalMaxToleranceResult([])).toBe("nao_avaliado");
  });

  test("evaluateCertificateMaxTolerance — sem tolerâncias configuradas", () => {
    const r = evaluateCertificateMaxTolerance(
      [{ point_number: 1, calc_status: "calculado", indication_error: 0.01, expanded_uncertainty: 0.01 }],
      [],
    );
    expect(r.general).toBe("nao_avaliado");
  });

  test("evaluateCertificateMaxTolerance — ponto calculado dentro", () => {
    const r = evaluateCertificateMaxTolerance(
      [{
        point_number: 1,
        nominal_value: "100",
        reading1: "100",
        calc_status: "calculado",
        indication_error: 0.02,
        expanded_uncertainty: 0.01,
      }],
      [{ point: 1, value: "0,05" }],
    );
    expect(r.general).toBe("aprovado");
    expect(r.pointResults[0].testValue).toBeCloseTo(0.03, 6);
  });

  test("evaluateCertificateMaxTolerance — ponto acima gera alerta", () => {
    const r = evaluateCertificateMaxTolerance(
      [{
        point_number: 2,
        nominal_value: "50",
        reading1: "50",
        calc_status: "calculado",
        indication_error: 0.08,
        expanded_uncertainty: 0.05,
      }],
      [{ point: 2, value: "0,10" }],
    );
    expect(r.general).toBe("alerta");
  });

  test("toleranceMapFromRaw ignora valores vazios", () => {
    const map = toleranceMapFromRaw([{ point: 1, value: "" }, { point: 3, value: "0,5" }]);
    expect(map.size).toBe(1);
    expect(map.get(3)).toBeCloseTo(0.5, 6);
  });
});
