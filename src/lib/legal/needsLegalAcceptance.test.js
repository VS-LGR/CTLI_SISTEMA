import { needsLegalAcceptance } from "./needsLegalAcceptance";
import { LEGAL_ACCEPTANCE_VERSION } from "./acceptance";
import { PRIVACY_VERSION } from "./privacyContent";

describe("needsLegalAcceptance", () => {
  test("false for unauthenticated", () => {
    expect(needsLegalAcceptance(null)).toBe(false);
    expect(needsLegalAcceptance(false)).toBe(false);
  });

  test("true when legal or privacy missing", () => {
    expect(needsLegalAcceptance({
      legal_accepted_at: "2026-01-01",
      legal_accepted_version: LEGAL_ACCEPTANCE_VERSION,
    })).toBe(true);
  });

  test("false when both versions match", () => {
    expect(needsLegalAcceptance({
      legal_accepted_at: "2026-01-01T00:00:00Z",
      legal_accepted_version: LEGAL_ACCEPTANCE_VERSION,
      privacy_accepted_at: "2026-09-15T00:00:00Z",
      privacy_accepted_version: PRIVACY_VERSION,
    })).toBe(false);
  });
});
