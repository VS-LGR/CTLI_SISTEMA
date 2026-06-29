import { buildCommercialProposalPdfViewModel } from "./viewModel";

describe("buildCommercialProposalPdfViewModel", () => {
  it("monta view model com cliente e balanças", () => {
    const vm = buildCommercialProposalPdfViewModel(
      {
        proposal_number: 1,
        proposal_year: 2026,
        proposal_date: "2026-06-30",
        subject: "Calibração",
        total_value: 1500,
        client_snapshot: { company: "Cliente Teste", address: "Rua A" },
        scales: [
          {
            manufacturer: "M1",
            model: "X",
            tag: "T",
            serial_number: "S",
            capacity: "10",
            resolution: "0.1",
            unit_value: 1500,
            calibration_points: [{ point_number: 1, nominal_value: "5" }],
          },
        ],
      },
      { name: "Lab Teste" },
    );
    expect(vm.header.proposalNumber).toBe("001/2026");
    expect(vm.client.company).toBe("Cliente Teste");
    expect(vm.scaleRows).toHaveLength(1);
    expect(vm.scaleRows[0].points).toBe("5");
    expect(vm.totalValue).toBe("1.500,00");
  });
});
