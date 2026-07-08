import {
  emptyVerificationResponses,
  getVerificationChecklist,
  normalizeVerificationResponses,
  verificationValueMode,
} from "./verificationChecklist";

describe("verificationChecklist", () => {
  test("checklists por tipo têm itens esperados", () => {
    expect(getVerificationChecklist("pesos").length).toBe(9);
    expect(getVerificationChecklist("thermo").length).toBe(7);
    expect(getVerificationChecklist("computador").length).toBe(6);
    expect(getVerificationChecklist("veiculo").length).toBe(10);
  });

  test("emptyVerificationResponses cobre 12 meses", () => {
    const r = emptyVerificationResponses("pesos");
    expect(Object.keys(r.limpo)).toHaveLength(12);
    expect(r.limpo["1"]).toBe("");
  });

  test("normalizeVerificationResponses preserva valores e completa meses", () => {
    const n = normalizeVerificationResponses("computador", {
      monitor: { "1": "ok", "5": "nok" },
    });
    expect(n.monitor["1"]).toBe("ok");
    expect(n.monitor["5"]).toBe("nok");
    expect(n.monitor["12"]).toBe("");
    expect(n.teclado["1"]).toBe("");
  });

  test("verificationValueMode", () => {
    expect(verificationValueMode("pesos")).toBe("sim_nao");
    expect(verificationValueMode("veiculo")).toBe("bom_ruim");
  });
});
