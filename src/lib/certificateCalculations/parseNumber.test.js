import { parseImportNumeric, toDbNumeric } from "./parseNumber";

describe("parseImportNumeric", () => {
  it("aceita números com unidade e vírgula decimal", () => {
    expect(parseImportNumeric("100 g").value).toBe(100);
    expect(parseImportNumeric("5,05 kg").value).toBe(5.05);
    expect(parseImportNumeric("23,5 °C").value).toBe(23.5);
  });

  it("rejeita erros de planilha e texto puro", () => {
    expect(parseImportNumeric("#N/D").valid).toBe(false);
    expect(parseImportNumeric("MA-07").valid).toBe(false);
    expect(parseImportNumeric("abc").valid).toBe(false);
  });

  it("converte para null no banco quando inválido", () => {
    expect(toDbNumeric("100 g")).toBe(100);
    expect(toDbNumeric("MA-07")).toBeNull();
    expect(toDbNumeric("")).toBeNull();
  });
});
