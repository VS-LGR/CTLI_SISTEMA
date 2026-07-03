import {
  calculateConformityForCertificate,
  computeLegalIndicationError,
  determineInstrumentClassFromLegalMetrology,
  evaluatePointConformity,
  lookupPortaria157VerificationDivisions,
  lookupPortaria236ToleranceDivisions,
} from "./conformityCalculations";

const LEGAL_BASE = { legal_metrology_applicable: true, decision_rule: "simples" };

describe("conformityCalculations — Metr. Legal (RE-7.2B Matriz 3)", () => {
  test("lookupPortaria157VerificationDivisions — classe III (Tabela 5 Verificação)", () => {
    expect(lookupPortaria157VerificationDivisions("III", 100)).toBe(1.0);
    expect(lookupPortaria157VerificationDivisions("III", 1000)).toBe(2.0);
    expect(lookupPortaria157VerificationDivisions("III", 5000)).toBe(2.0);
  });

  test("lookupPortaria236ToleranceDivisions — classe III (modelo legado)", () => {
    expect(lookupPortaria236ToleranceDivisions("III", 100)).toBe(0.5);
    expect(lookupPortaria236ToleranceDivisions("III", 1000)).toBe(1.0);
    expect(lookupPortaria236ToleranceDivisions("III", 5000)).toBe(1.5);
  });

  test("computeLegalIndicationError — Validação 210 g (erro exibido 0)", () => {
    const err = computeLegalIndicationError(
      {
        nominal_value: 210.0001,
        average_reading: 210.0001,
        resolution: "0.0001",
      },
      { unidade: "g", decimal_places: { p1: 4 } },
      "g",
    );
    expect(err.valid).toBe(true);
    expect(err.value).toBe(0);
  });

  test("computeLegalIndicationError — 001/2025 P3 (erro −0,1)", () => {
    const err = computeLegalIndicationError(
      {
        nominal_value: 150,
        average_reading: 149.9,
        resolution: "0.1",
      },
      { unidade: "kg", decimal_places: { p1: 1 } },
      "kg",
    );
    expect(err.valid).toBe(true);
    expect(err.value).toBe(-0.1);
  });

  test("evaluatePointConformity — tolerância zero exige erro exatamente zero", () => {
    expect(evaluatePointConformity(0, null, 0, 0).result).toBe("conforme");
    expect(evaluatePointConformity(-0.1, null, 0, 0).result).toBe("nao_conforme");
    expect(evaluatePointConformity(0.0001, null, 0, 0).result).toBe("nao_conforme");
  });

  test("Validação 2025 — todos os pontos CONFORME com tolerância zero", () => {
    const points = Array.from({ length: 10 }, (_, i) => ({
      point_number: i + 1,
      nominal_value: 210.0001,
      average_reading: 210.0001,
      indication_error: 0.0001,
      expanded_uncertainty: 0.00062,
      resolution: "0.0001",
      calc_status: "calculado",
    }));

    const result = calculateConformityForCertificate({
      balance: {
        unidade: "g",
        capacidade: "210",
        resolucao: "0.0001",
        divisao_verificacao: "0",
        decimal_places: { p1: 4 },
      },
      points,
      conformity: LEGAL_BASE,
    });

    expect(result.partialResult).toBe("conforme");
    expect(result.general).toBe("conforme");
    expect(result.pointResults.every((p) => p.result === "conforme")).toBe(true);
  });

  test("001/2025 — ponto com erro −0,1 é NÃO-CONFORME", () => {
    const points = [
      {
        point_number: 3,
        nominal_value: 150,
        average_reading: 149.9,
        indication_error: -0.1,
        expanded_uncertainty: 0.05,
        resolution: "0.1",
        calc_status: "calculado",
      },
    ];

    const result = calculateConformityForCertificate({
      balance: {
        unidade: "kg",
        capacidade: "500",
        resolucao: "0.1",
        divisao_verificacao: "0",
        decimal_places: { p1: 1 },
      },
      points,
      conformity: LEGAL_BASE,
    });

    expect(result.pointResults[0].result).toBe("nao_conforme");
    expect(result.general).toBe("nao_conforme");
  });

  test("determineInstrumentClassFromLegalMetrology — divisão zero (planilha atribui classe I)", () => {
    const cls = determineInstrumentClassFromLegalMetrology({
      unidade: "g",
      capacidade: "210",
      divisao_verificacao: "0",
    });
    expect(cls.instrumentClass).toBe("I");
  });
});
