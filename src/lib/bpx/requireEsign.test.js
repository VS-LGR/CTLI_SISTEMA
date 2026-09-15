import { requireEsignCredentials } from "./requireEsign";

describe("requireEsignCredentials", () => {
  test("returns password and meaning", () => {
    expect(requireEsignCredentials({
      esignPassword: "secret",
      esignMeaning: "Aprovo o certificado.",
    })).toEqual({ password: "secret", meaning: "Aprovo o certificado." });
  });

  test("throws without password", () => {
    expect(() => requireEsignCredentials({ esignMeaning: "Aprovo." }))
      .toThrow(/Assinatura eletrónica obrigatória/);
  });

  test("uses default meaning when omitted", () => {
    expect(requireEsignCredentials({ esignPassword: "x" }, "Emito.")).toEqual({
      password: "x",
      meaning: "Emito.",
    });
  });
});
