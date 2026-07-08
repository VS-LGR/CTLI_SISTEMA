import {
  emptyVerificationResponses,
  getVerificationChecklist,
  isLegacyResponses,
  isLegacyResponsible,
  LEGACY_ASSET_KEY,
  normalizeMultiAssetResponses,
  normalizeMultiAssetResponsible,
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

  test("normalizeMultiAssetResponses converte formato legado", () => {
    const legacy = { limpo: { "1": "ok" } };
    expect(isLegacyResponses(legacy, "pesos")).toBe(true);
    const n = normalizeMultiAssetResponses("pesos", legacy, []);
    expect(n[LEGACY_ASSET_KEY].limpo["1"]).toBe("ok");
  });

  test("normalizeMultiAssetResponses por equipamento", () => {
    const n = normalizeMultiAssetResponses("pesos", {
      a1: { limpo: { "1": "ok" } },
      a2: { limpo: { "2": "nok" } },
    }, ["a1", "a2"]);
    expect(n.a1.limpo["1"]).toBe("ok");
    expect(n.a2.limpo["2"]).toBe("nok");
  });

  test("normalizeMultiAssetResponsible converte legado", () => {
    expect(isLegacyResponsible({ "1": "João" })).toBe(true);
    const n = normalizeMultiAssetResponsible({ "1": "João" }, []);
    expect(n[LEGACY_ASSET_KEY]["1"]).toBe("João");
  });

  test("verificationValueMode", () => {
    expect(verificationValueMode("pesos")).toBe("sim_nao");
    expect(verificationValueMode("veiculo")).toBe("bom_ruim");
  });
});
