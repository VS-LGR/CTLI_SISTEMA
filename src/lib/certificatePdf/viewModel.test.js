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

  test("observações legais com 7 itens", () => {
    const model = buildCertificatePdfViewModel(EMISSAO_TESTE_CERT);
    expect(model.observations).toHaveLength(7);
    expect(model.observations[1]).toContain("CTLI");
  });
});
