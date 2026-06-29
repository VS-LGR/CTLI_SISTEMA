import { scaleToBalanca } from "./commercialProposalCadastroExport";

describe("commercialProposalCadastroExport", () => {
  it("scaleToBalanca mapeia campos da proposta", () => {
    const bal = scaleToBalanca({
      manufacturer: "M",
      model: "X",
      tag: "T1",
      serial_number: "S1",
      capacity: "10",
      resolution: "0.1",
    });
    expect(bal.fabricante).toBe("M");
    expect(bal.serie).toBe("S1");
    expect(bal.capacidade).toBe("10");
  });
});
