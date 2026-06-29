import {
  evaluateCertificateMaxTolerance,
  evaluatePointMaxTolerance,
  generalMaxToleranceResult,
  normalizePointMaxTolerances,
  toleranceMapFromRaw,
  maxToleranceAlertPointSet,
  maxToleranceAlertSummary,
  formatMaxTolerancePointLabel,
  resolveToleranceNominalForPoint,
  findToleranceForNominal,
  buildLoadToleranceMap,
} from "./pointMaxToleranceVerification";

describe("pointMaxToleranceVerification", () => {
  test("normalizePointMaxTolerances — por pesagem deduplica e ordena", () => {
    const raw = [
      { nominal_value: "300", unit: "kg", max_tolerance: "0,6" },
      { nominal_value: "150", unit: "kg", max_tolerance: "0,3" },
      { nominal_value: "300", unit: "kg", max_tolerance: "0,7" },
    ];
    expect(normalizePointMaxTolerances(raw)).toEqual([
      { nominal_value: "150", unit: "kg", max_tolerance: "0,3" },
      { nominal_value: "300", unit: "kg", max_tolerance: "0,6" },
    ]);
  });

  test("normalizePointMaxTolerances — aceita legado por ponto", () => {
    expect(normalizePointMaxTolerances([{ point: 2, value: "0,1" }])).toEqual([
      { point: 2, max_tolerance: "0,1", _legacyPoint: true },
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

  test("evaluateCertificateMaxTolerance — pesagem 300 kg dentro da tolerância", () => {
    const r = evaluateCertificateMaxTolerance(
      [{
        point_number: 1,
        nominal_value: "300",
        reading1: "300",
        calc_status: "calculado",
        indication_error: 0.02,
        expanded_uncertainty: 0.01,
      }],
      [{ nominal_value: "300", unit: "kg", max_tolerance: "0,6" }],
      { defaultUnit: "kg" },
    );
    expect(r.general).toBe("aprovado");
    expect(r.pointResults[0].nominalDisplay).toBe("300 kg");
    expect(r.pointResults[0].testValue).toBeCloseTo(0.03, 6);
  });

  test("evaluateCertificateMaxTolerance — usa V.N. dos pesos, não V.V.C. do certificado", () => {
    const weightItems = [
      { id: "w1", nominal_value: "300", conventional_value: "300.0004", unit: "kg" },
    ];
    const r = evaluateCertificateMaxTolerance(
      [{
        point_number: 1,
        nominal_value: "300.0004",
        standard_weight_ids: ["w1"],
        reading1: "300",
        calc_status: "calculado",
        indication_error: 0.02,
        expanded_uncertainty: 0.01,
      }],
      [{ nominal_value: "300", unit: "kg", max_tolerance: "0,6" }],
      { defaultUnit: "kg", weightItems },
    );
    expect(r.general).toBe("aprovado");
    expect(r.pointResults[0].nominalSource).toBe("peso_padrao");
    expect(r.pointResults[0].nominalValue).toBeCloseTo(300, 6);
  });

  test("evaluateCertificateMaxTolerance — V.V.C. sem tolerância para V.N. não avalia", () => {
    const weightItems = [
      { id: "w1", nominal_value: "300", conventional_value: "300.0004", unit: "kg" },
    ];
    const r = evaluateCertificateMaxTolerance(
      [{
        point_number: 1,
        nominal_value: "300.0004",
        standard_weight_ids: ["w1"],
        reading1: "300",
        calc_status: "calculado",
        indication_error: 0.5,
        expanded_uncertainty: 0.2,
      }],
      [{ nominal_value: "300.0004", unit: "kg", max_tolerance: "0,1" }],
      { defaultUnit: "kg", weightItems },
    );
    expect(r.pointResults).toEqual([]);
    expect(r.general).toBe("nao_avaliado");
  });

  test("evaluateCertificateMaxTolerance — mesma pesagem em P2 gera alerta", () => {
    const r = evaluateCertificateMaxTolerance(
      [{
        point_number: 2,
        nominal_value: "300",
        reading1: "300.1",
        calc_status: "calculado",
        indication_error: 0.5,
        expanded_uncertainty: 0.2,
      }],
      [{ nominal_value: "300", unit: "kg", max_tolerance: "0,6" }],
      { defaultUnit: "kg" },
    );
    expect(r.general).toBe("alerta");
    expect(r.pointResults[0].pointNumber).toBe(2);
  });

  test("evaluateCertificateMaxTolerance — pesagem sem tolerância cadastrada não avalia", () => {
    const r = evaluateCertificateMaxTolerance(
      [{
        point_number: 1,
        nominal_value: "50",
        calc_status: "calculado",
        indication_error: 0.5,
        expanded_uncertainty: 0.2,
      }],
      [{ nominal_value: "300", unit: "kg", max_tolerance: "0,6" }],
      { defaultUnit: "kg" },
    );
    expect(r.pointResults).toEqual([]);
    expect(r.general).toBe("nao_avaliado");
  });

  test("evaluateCertificateMaxTolerance — legado por número de ponto", () => {
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

  test("findToleranceForNominal — converte unidades", () => {
    const map = buildLoadToleranceMap([
      { nominal_value: "300", unit: "kg", max_tolerance: "0,6" },
    ]);
    const match = findToleranceForNominal("300000", "g", map);
    expect(match?.parsedTolerance).toBeCloseTo(0.6, 6);
  });

  test("toleranceMapFromRaw legado ignora valores vazios", () => {
    const map = toleranceMapFromRaw([{ point: 1, value: "" }, { point: 3, value: "0,5" }]);
    expect(map.size).toBe(1);
    expect(map.get(3)).toBeCloseTo(0.5, 6);
  });

  test("maxToleranceAlertPointSet retorna apenas pontos em alerta", () => {
    const results = [
      { pointNumber: 1, nominalValue: "300", nominalUnit: "kg", result: "aprovado" },
      { pointNumber: 3, nominalValue: "150", nominalUnit: "kg", result: "alerta" },
    ];
    expect(maxToleranceAlertPointSet(results)).toEqual(new Set([3]));
    expect(maxToleranceAlertSummary(results)).toContain("P3");
    expect(formatMaxTolerancePointLabel(results[1])).toBe("150 kg");
  });
});
