import {
  observationsArrayToLines,
  observationsLinesToArray,
  buildExportTemplateConfigWithObservations,
  isCertificateMasterDocument,
} from "./certificateObservationsConfig";

describe("certificateObservationsConfig", () => {
  test("converte linhas em array e vice-versa", () => {
    const text = "Primeira\n\nSegunda\n  Terceira  ";
    expect(observationsLinesToArray(text)).toEqual(["Primeira", "Segunda", "Terceira"]);
    expect(observationsArrayToLines(["A", "B"])).toBe("A\nB");
  });

  test("identifica documento RE-7.2B", () => {
    expect(isCertificateMasterDocument({ code: "RE-7.2B" })).toBe(true);
    expect(isCertificateMasterDocument({ template_key: "re-72b-certificado-calibracao-pdf" })).toBe(true);
    expect(isCertificateMasterDocument({ code: "RE-7.2A" })).toBe(false);
  });

  test("monta export_template_config com observações", () => {
    const cfg = buildExportTemplateConfigWithObservations({ foo: "bar" }, {
      rbcText: "Item RBC",
      rastreavelText: "Item A\nItem B",
    });
    expect(cfg.foo).toBe("bar");
    expect(cfg.certificateObservations.rbc).toEqual(["Item RBC"]);
    expect(cfg.certificateObservations.rastreavel).toEqual(["Item A", "Item B"]);
  });
});
