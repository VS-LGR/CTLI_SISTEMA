/**
 * Testes unitários do parse de números falados (pt-BR) — coleta PR-7.2.
 */
import { parseSpokenNumber } from "./parseSpokenNumber";

describe("parseSpokenNumber", () => {
  it("aceita dígitos com vírgula", () => {
    expect(parseSpokenNumber("20,45")).toEqual({
      ok: true,
      value: "20,45",
      numeric: 20.45,
    });
  });

  it("aceita dígitos com ponto", () => {
    expect(parseSpokenNumber("1013.2")).toEqual({
      ok: true,
      value: "1013,2",
      numeric: 1013.2,
    });
  });

  it("interpreta palavras com vírgula", () => {
    const r = parseSpokenNumber("vinte vírgula cinco");
    expect(r.ok).toBe(true);
    expect(r.value).toBe("20,5");
    expect(r.numeric).toBe(20.5);
  });

  it("rejeita transcript vazio", () => {
    expect(parseSpokenNumber("").ok).toBe(false);
  });

  it("rejeita texto ambíguo", () => {
    expect(parseSpokenNumber("olá laboratório").ok).toBe(false);
  });
});
