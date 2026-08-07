import {
  normalizeSpokenQuery,
  parseSpokenText,
  parseSpokenChoice,
  matchSpokenLookup,
  YES_NO_OPTIONS,
  interpretSpokenField,
} from "./spokenMatch";

describe("spokenMatch", () => {
  it("normaliza query", () => {
    expect(normalizeSpokenQuery("  Café  São  ")).toBe("cafe sao");
  });

  it("parseSpokenText", () => {
    expect(parseSpokenText("  Acme Ltda  ")).toEqual({ ok: true, value: "Acme Ltda" });
    expect(parseSpokenText("").ok).toBe(false);
  });

  it("parseSpokenChoice sim/não", () => {
    expect(parseSpokenChoice("sim", YES_NO_OPTIONS).value).toBe("sim");
    expect(parseSpokenChoice("não", YES_NO_OPTIONS).value).toBe("nao");
  });

  it("matchSpokenLookup por nome parcial de cliente", () => {
    const records = [
      { id: "1", name: "Indústria Alpha Ltda", cnpj: "11.111.111/0001-11" },
      { id: "2", name: "Beta Metrologia", cnpj: "22.222.222/0001-22" },
    ];
    const r = matchSpokenLookup("alpha", records, (c) => c.name, {
      getSearchText: (c) => `${c.name} ${c.cnpj}`,
    });
    expect(r.ok).toBe(true);
    expect(r.record.id).toBe("1");
  });

  it("matchSpokenLookup por identificação de peso", () => {
    const records = [
      { id: "a", identification: "E2-100g-01" },
      { id: "b", identification: "F1-200g-02" },
    ];
    const r = matchSpokenLookup("E2-100", records, (w) => w.identification);
    expect(r.ok).toBe(true);
    expect(r.record.id).toBe("a");
  });

  it("interpretSpokenField number", () => {
    const r = interpretSpokenField("number", "20,5");
    expect(r.ok).toBe(true);
    expect(r.value).toBe("20,5");
  });

  it("interpretSpokenField choice classe", () => {
    const r = interpretSpokenField("choice", "F1", {
      options: [{ value: "F1", label: "F1" }, { value: "M1", label: "M1" }],
    });
    expect(r.ok).toBe(true);
    expect(r.value).toBe("F1");
  });
});
