import { buildColetaPayloadFromProposalScale } from "./commercialProposalToColeta";

describe("buildColetaPayloadFromProposalScale", () => {
  const proposal = {
    end_customer_id: "cust-1",
    client_snapshot: { company: "ACME", attention_to: "João" },
    proposal_number: 5,
    proposal_year: 2026,
  };

  const scale = {
    manufacturer: "Toledo",
    model: "2096",
    tag: "BAL-01",
    serial_number: "SN123",
    capacity: "30",
    resolution: "0.01",
    unit: "kg",
    client_requested_points: "sim",
    calibration_points: [
      { point_number: 1, nominal_value: "0", nominal_unit: "kg" },
      { point_number: 2, nominal_value: "15", nominal_unit: "kg" },
      { point_number: 3, nominal_value: "30", nominal_unit: "kg" },
    ],
  };

  it("maps cliente, balança e pontos de calibração", () => {
    const payload = buildColetaPayloadFromProposalScale(proposal, scale);
    expect(payload.cliente.cliente).toBe("ACME");
    expect(payload.cliente.responsavel).toBe("João");
    expect(payload.cliente.end_customer_id).toBe("cust-1");
    expect(payload.balanca.fabricante).toBe("Toledo");
    expect(payload.balanca.serie).toBe("SN123");
    expect(payload.balanca.unidade).toBe("kg");
    expect(payload.calibracao.pontos[0].peso_nominal_valor).toBe("0");
    expect(payload.calibracao.pontos[1].peso_nominal_valor).toBe("15");
    expect(payload.calibracao.pontos[2].peso_nominal_valor).toBe("30");
    expect(payload.controle.pontos_solicitados).toBe("sim");
  });
});
