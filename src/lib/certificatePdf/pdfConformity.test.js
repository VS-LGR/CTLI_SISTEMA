import { buildCertificatePdfViewModel } from "@/lib/certificatePdf/viewModel";
import { calculateConformityForCertificate } from "@/lib/certificateCalculations/conformityCalculations";

/** Validação 2025 — Certificado-RBC (V.R. 210 g, média 210,0001 g). */
const VALIDACAO_2025_PDF = {
  certificate_type: "rbc",
  certificate_number: 0,
  certificate_year: 2025,
  balance_snapshot: {
    unidade: "g",
    capacidade: "210",
    resolucao: "0.0001",
    decimal_places: { p1: 4 },
  },
  environmental: {
    initial_temperature: "24",
    final_temperature: "24",
    initial_humidity: "65",
    final_humidity: "58",
    initial_pressure: "935",
    final_pressure: "935",
  },
  points: [{
    point_number: 1,
    nominal_value: 210,
    resolution: "0.0001",
    reading1: 210.0001,
    reading2: 210.0001,
    reading3: 210.0001,
    average_reading: 210.0001,
    indication_error: 0.0001,
    expanded_uncertainty: 0.00062,
    coverage_factor: 2,
    degrees_of_freedom: 100,
    calc_status: "calculado",
  }],
};

/** Validação 2025 — Metr. Legal (V.R. = média após MROUND → erro 0). */
const VALIDACAO_2025_LEGAL = {
  balance_snapshot: {
    unidade: "g",
    capacidade: "210",
    resolucao: "0.0001",
    divisao_verificacao: "0",
    decimal_places: { p1: 4 },
  },
  points: [{
    point_number: 1,
    nominal_value: 210.0001,
    resolution: "0.0001",
    average_reading: 210.0001,
    indication_error: 0.0001,
    expanded_uncertainty: 0.00062,
    calc_status: "calculado",
  }],
};

describe("PDF e conformidade — golden planilha", () => {
  test("viewModel arredonda Ue e E conforme RE-7.2B Certificado-RBC", () => {
    const model = buildCertificatePdfViewModel(VALIDACAO_2025_PDF);
    const row = model.repeatabilityRows[0];
    expect(row.expandedUncertainty.value).toBe("0,0007");
    expect(row.indicationError.value).toBe("0,0001");
    expect(row.k).toBe("2,00");
    expect(row.veff).toBe("∞");
  });

  test("conformidade metrologia legal avalia pontos calculados", () => {
    const result = calculateConformityForCertificate({
      balance: VALIDACAO_2025_LEGAL.balance_snapshot,
      points: VALIDACAO_2025_LEGAL.points,
      conformity: { legal_metrology_applicable: true, decision_rule: "simples" },
    });
    expect(result.general).toBe("conforme");
    expect(result.pointResults).toHaveLength(1);
    expect(result.pointResults[0].result).toBe("conforme");
  });

  test("PDF não exibe declaração CERTIFICADO: CONFORME", () => {
    const model = buildCertificatePdfViewModel({
      ...VALIDACAO_2025_PDF,
      conformity: {
        legal_metrology_applicable: true,
        general_conformity_result: "conforme",
      },
    });
    expect(model.conformityDeclaration).toBe("");
  });
});
