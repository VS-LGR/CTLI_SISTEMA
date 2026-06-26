import { parseImportNumeric, toDbNumeric, decimalPlacesFromResolution, fmtEmpMicro, fmtEmpScientific } from "./parseNumber";

describe("parseImportNumeric", () => {
  it("aceita números com unidade e vírgula decimal", () => {
    expect(parseImportNumeric("100 g").value).toBe(100);
    expect(parseImportNumeric("5,05 kg").value).toBe(5.05);
    expect(parseImportNumeric("23,5 °C").value).toBe(23.5);
    expect(parseImportNumeric("0,0004").value).toBe(0.0004);
  });

  it("rejeita erros de planilha e texto puro", () => {
    expect(parseImportNumeric("#N/D").valid).toBe(false);
    expect(parseImportNumeric("MA-07").valid).toBe(false);
    expect(parseImportNumeric("abc").valid).toBe(false);
  });

  it("converte para null no banco quando inválido", () => {
    expect(toDbNumeric("100 g")).toBe(100);
    expect(toDbNumeric("0,0004")).toBe(0.0004);
    expect(toDbNumeric("MA-07")).toBeNull();
    expect(toDbNumeric("")).toBeNull();
  });
});

describe("decimalPlacesFromResolution", () => {
  it("infere casas decimais da resolução cadastrada", () => {
    expect(decimalPlacesFromResolution("0,0004")).toBe(4);
    expect(decimalPlacesFromResolution("0,05")).toBe(2);
    expect(decimalPlacesFromResolution("0.01")).toBe(2);
    expect(decimalPlacesFromResolution("300")).toBe(0);
    expect(decimalPlacesFromResolution("")).toBeNull();
  });
});

describe("fmtEmpMicro", () => {
  it("não mascara 1,72×10⁻¹⁴ como zero", () => {
    expect(fmtEmpMicro(1.72e-14)).toMatch(/×10/);
    expect(fmtEmpMicro(1.72e-14)).not.toBe("0.000000000000");
    expect(fmtEmpScientific(1.72e-14)).toBe("1,72×10⁻¹⁴");
  });

  it("formata Urel Validação 2026 com precisão adequada", () => {
    expect(fmtEmpMicro(2.8332e-7)).toMatch(/0\.000000283/);
  });

  it("zero explícito", () => {
    expect(fmtEmpMicro(0)).toBe("0");
  });
});
