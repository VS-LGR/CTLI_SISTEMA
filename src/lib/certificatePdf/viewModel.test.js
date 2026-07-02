import { buildCertificatePdfViewModel } from "./viewModel";

/** Fixture baseada no EmissãoTeste.pdf — condições ambientais e massa específica do ar. */
const EMISSAO_TESTE_CERT = {
  certificate_type: "rbc",
  certificate_number: 1,
  certificate_year: 2025,
  calibration_date: "2025-10-17",
  client_name: "Jéssica Thais Della Dea Rodrigues",
  scale_serial: "12344368",
  balance_snapshot: {
    fabricante: "TOLEDO",
    modelo: "2099/59",
    serie: "12344368",
    capacidade: "300",
    resolucao: "0,05",
    divisao_verificacao: "0,05",
    unidade: "kg",
    tipo_balanca: "industrial",
    tag: "AP-2000",
    local: "Expedição",
    etiqueta_ipem: "123456-7",
    tipo_plataforma: "quadrada",
  },
  environmental: {
    initial_temperature: "20",
    final_temperature: "21",
    initial_humidity: "50",
    final_humidity: "51",
    initial_pressure: "950",
    final_pressure: "951",
  },
  points: [
    {
      point_number: 1,
      nominal_value: 100,
      reading1: 100,
      reading2: 100,
      reading3: 100,
      average_reading: 100,
      indication_error: 0,
      expanded_uncertainty: 0.05,
      coverage_factor: 2,
      degrees_of_freedom: 100,
    },
  ],
  standards: [],
  technical_snapshot: {
    clientSnapshot: {
      name: "Jéssica Thais Della Dea Rodrigues",
      cnpj: "332.603.288-90",
      city: "São Paulo",
      state: "SP",
      unit: "Mairinque",
      representative_name: "Jéssica Rodrigues",
    },
  },
};

describe("buildCertificatePdfViewModel — EmissãoTeste", () => {
  test("calcula massa específica do ar a partir de T/UR/P (golden 1,12 kg/m³)", () => {
    const model = buildCertificatePdfViewModel(EMISSAO_TESTE_CERT);
    expect(model.environmental.airDensity).toBe("1,12 kg/m³");
  });

  test("expõe campos de cliente e instrumento do modelo", () => {
    const model = buildCertificatePdfViewModel(EMISSAO_TESTE_CERT);
    expect(model.client.representative).toBe("Jéssica Rodrigues");
    expect(model.client.unit).toBe("Mairinque");
    expect(model.balance.tipo).toBeTruthy();
    expect(model.balance.etiqueta).toBe("123456-7");
    expect(model.balance.identificacao).toBe("AP-2000");
    expect(model.balance.plataforma).toBeTruthy();
  });

  test("formata condições ambientais no padrão EmissãoTeste", () => {
    const model = buildCertificatePdfViewModel({
      ...EMISSAO_TESTE_CERT,
      environmental: {
        initial_temperature: "19,5",
        final_temperature: "21,5",
        initial_humidity: "50",
        final_humidity: "51",
        initial_pressure: "947",
        final_pressure: "954",
      },
    });
    expect(model.environmental.temperature).toMatch(/20,5 °C ± 1,00/);
    expect(model.environmental.humidity).toMatch(/50,5 % ± 3,5/);
    expect(model.environmental.pressure).toMatch(/950,5 hPA ± 5,5/);
  });

  test("observações legais com 7 itens", () => {
    const model = buildCertificatePdfViewModel(EMISSAO_TESTE_CERT);
    expect(model.observations).toHaveLength(7);
    expect(model.observations[1]).toContain("CTLI");
  });

  test("observações da Lista Mestra substituem o padrão", () => {
    const model = buildCertificatePdfViewModel(EMISSAO_TESTE_CERT, {
      documentMeta: {
        certificateObservations: {
          rbc: ["Observação customizada 1", "Observação customizada 2"],
        },
      },
    });
    expect(model.observations).toEqual(["Observação customizada 1", "Observação customizada 2"]);
  });

  test("snapshot do certificado emitido preserva observações", () => {
    const model = buildCertificatePdfViewModel({
      ...EMISSAO_TESTE_CERT,
      document_snapshot: {
        documentCode: "RE-7.2B",
        certificateObservations: {
          rbc: ["Observação congelada na emissão"],
        },
      },
    });
    expect(model.observations).toEqual(["Observação congelada na emissão"]);
  });

  test("repeatabilityRows com 10 linhas e colunas valor/unidade", () => {
    const model = buildCertificatePdfViewModel(EMISSAO_TESTE_CERT);
    expect(model.repeatabilityRows).toHaveLength(10);
    expect(model.repeatabilityRows[0].reference.value).toBeTruthy();
    expect(model.repeatabilityRows[0].reference.unit).toBe("kg");
    expect(model.repeatabilityRows[0].veff).toBe("∞");
    expect(model.repeatabilityRows[1].empty).toBe(true);
    expect(model.repeatabilityRows[1].reference.value).toBe("--");
    expect(model.calibratedPointsCount).toBe(1);
    expect(model.readingsPerPoint).toBe("3");
  });

  test("Veff usa calculation_memory quando degrees_of_freedom ausente no banco", () => {
    const model = buildCertificatePdfViewModel({
      ...EMISSAO_TESTE_CERT,
      points: [{
        ...EMISSAO_TESTE_CERT.points[0],
        degrees_of_freedom: null,
        calc_status: "calculado",
        repeatability: 0,
        calculation_memory: {
          ua: 0,
          up: 0.0002,
          ud: 0.0001,
          ue: 0.00005,
          ur: 0.00003,
          upLC: 0,
          readingCount: 3,
        },
      }],
    });
    expect(model.repeatabilityRows[0].veff).toBe("∞");
  });

  test("sem ajuste — colunas antes-do-ajuste com traço e subtítulo", () => {
    const model = buildCertificatePdfViewModel({
      ...EMISSAO_TESTE_CERT,
      environmental: {
        ...EMISSAO_TESTE_CERT.environmental,
        balance_adjusted: "nao",
      },
    });
    expect(model.adjustmentSubtitle).toContain("Não foi realizado o ajuste");
    expect(model.adjustmentPerformed).toBe(false);
    expect(model.repeatabilityRows[0].reference.value).toBeTruthy();
    expect(model.repeatabilityRows[0].beforeReading.value).toBe("--");
    expect(model.repeatabilityRows[0].beforeError.value).toBe("--");
    expect(model.repeatabilityRows[0].average.value).toBeTruthy();
  });
});

const ECCENTRICITY_CERT_BASE = {
  ...EMISSAO_TESTE_CERT,
  balance_snapshot: {
    ...EMISSAO_TESTE_CERT.balance_snapshot,
    resolucao: "0,0001",
    unidade: "g",
    tipo_plataforma: "quadrada",
  },
  eccentricity_snapshot: {
    valor_aplicado: "200",
    pontos: [
      { antes: 201.0001, depois: 201.0001 },
      { antes: 150, depois: 201 },
      { antes: 201.00015, depois: 201 },
      { antes: 201, depois: 201.0001 },
      { antes: 201, depois: 201 },
    ],
  },
};

describe("buildCertificatePdfViewModel — excentricidade", () => {
  test("snapshot vazio — seção visível, subtítulo e células ---", () => {
    const model = buildCertificatePdfViewModel(EMISSAO_TESTE_CERT);
    expect(model.eccentricity.showSection).toBe(true);
    expect(model.eccentricity.eccentricitySubtitle).toContain("Não foi realizado o ensaio de excentricidade");
    expect(model.eccentricity.points).toHaveLength(5);
    model.eccentricity.points.forEach((pt) => {
      expect(pt.beforeDisplay).toBe("---");
      expect(pt.afterDisplay).toBe("---");
    });
  });

  test("sem ajuste com dados — coluna única de resultados e valor aplicado", () => {
    const model = buildCertificatePdfViewModel({
      ...ECCENTRICITY_CERT_BASE,
      environmental: {
        ...EMISSAO_TESTE_CERT.environmental,
        balance_adjusted: "nao",
      },
    });
    expect(model.eccentricity.hasEccentricityData).toBe(true);
    expect(model.eccentricity.showBeforeAfterColumns).toBe(false);
    expect(model.eccentricity.appliedValueDisplay).toBe("200,0000 g");
    expect(model.eccentricity.eccentricitySubtitle).toBe("");
    expect(model.eccentricity.points[0].resultDisplay).toBe("201,0001 g");
    expect(model.eccentricity.points[1].resultDisplay).toBe("201,0000 g");
  });

  test("com ajuste — colunas antes/após e leituras formatadas", () => {
    const model = buildCertificatePdfViewModel({
      ...ECCENTRICITY_CERT_BASE,
      environmental: {
        ...EMISSAO_TESTE_CERT.environmental,
        balance_adjusted: "sim",
      },
    });
    expect(model.eccentricity.showBeforeAfterColumns).toBe(true);
    expect(model.eccentricity.appliedValueDisplay).toBe("200,0000 g");
    expect(model.eccentricity.points[0].beforeDisplay).toBe("201,0001 g");
    expect(model.eccentricity.points[0].afterDisplay).toBe("201,0001 g");
    expect(model.eccentricity.points[1].beforeDisplay).toBe("150,0000 g");
    expect(model.eccentricity.points[1].afterDisplay).toBe("201,0000 g");
    expect(model.eccentricity.points[2].beforeDisplay).toBe("201,0001 g");
  });

  test("tipo_plataforma excentricidade_na — oculta seção", () => {
    const model = buildCertificatePdfViewModel({
      ...EMISSAO_TESTE_CERT,
      balance_snapshot: {
        ...EMISSAO_TESTE_CERT.balance_snapshot,
        tipo_plataforma: "excentricidade_na",
      },
    });
    expect(model.eccentricity.showSection).toBe(false);
  });
});
