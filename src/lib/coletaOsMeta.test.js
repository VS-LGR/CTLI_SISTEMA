import {
  formatColetaOsTitle,
  formatColetaProposalLine,
  formatCollectionRef,
  padOsNumber,
} from "./coletaOsMeta";

describe("coletaOsMeta", () => {
  test("formatCollectionRef e O.S.", () => {
    expect(padOsNumber(1)).toBe("001");
    expect(formatCollectionRef(1, 2026)).toBe("001/2026");
    expect(formatColetaOsTitle({ collectionNumber: 1, collectionYear: 2026 }))
      .toBe("Coleta de dados 001/2026 - O.S. 001");
    expect(formatColetaProposalLine("42/2026"))
      .toBe("Referente à proposta comercial 42/2026");
  });
});
