import { documentIdentity, htmlToBlocks } from "./formattedProcedureModel";

describe("formattedProcedureModel", () => {
  it("lê código no título quando a emissão está gravada no campo código", () => {
    const identity = documentIdentity({
      title: "PR-4.1 Confidencialidade",
      code: "2026-03-01",
      version: "Rev. 03",
      responsible: "Ana",
      review_date: "2027-03-01",
    });
    expect(identity.code).toBe("PR-4.1");
    expect(identity.revision).toBe("Rev. 03");
    expect(identity.emissionIso).toBe("2026-03-01");
    expect(identity.responsible).toBe("Ana");
    expect(identity.nextReview).not.toBe("—");
  });

  it("mantém o código quando o campo não é uma data", () => {
    expect(documentIdentity({ title: "Manual", code: "MQ-01", version: "01" }).code).toBe("MQ-01");
  });

  it("preserva tabela, lista e imagem do corpo", () => {
    const blocks = htmlToBlocks(`
      <h1>Objectivo</h1>
      <p>Texto do procedimento</p>
      <table><tr><th>Passo</th><th>Registo</th></tr><tr><td>1</td><td>Folha</td></tr></table>
      <ul><li>Distribuir</li></ul>
      <p><img src="data:image/png;base64,abc" /></p>
    `);
    expect(blocks.map((block) => block.type)).toEqual(["heading", "paragraph", "table", "list", "image"]);
    expect(blocks[2].header).toBe(true);
    expect(blocks[2].rows[1]).toEqual(["1", "Folha"]);
    expect(blocks[3].items).toEqual(["Distribuir"]);
  });

});
