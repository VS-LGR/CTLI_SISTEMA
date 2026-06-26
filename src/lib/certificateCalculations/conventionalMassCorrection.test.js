import {
  resolveReferenceFromConventionalMass,
  shouldApplyVccCorrection,
  correctConventionalMassForBuoyancy,
} from "./conventionalMassCorrection";

describe("resolveReferenceFromConventionalMass — Certificado-RBC AI49", () => {
  test("ρ_ar dentro da faixa — V.R. = V.C sem correção", () => {
    const res = resolveReferenceFromConventionalMass({
      vcUncorrected: 210,
      airDensity: 1.12,
      materialDensity: 7900,
    });
    expect(res.vccApplied).toBe(false);
    expect(res.reference).toBe(210);
  });

  test("ρ_ar = 1,05 — aplica correção VCC no agregado", () => {
    expect(shouldApplyVccCorrection(1.05)).toBe(true);
    const res = resolveReferenceFromConventionalMass({
      vcUncorrected: 210,
      airDensity: 1.05,
      materialDensity: 7900,
    });
    expect(res.vccApplied).toBe(true);
    expect(res.reference).not.toBe(210);
    expect(res.reference).toBeCloseTo(
      correctConventionalMassForBuoyancy(210, 1.05, 7900),
      10,
    );
  });

  test("V.C inválido retorna null", () => {
    const res = resolveReferenceFromConventionalMass({
      vcUncorrected: null,
      airDensity: 1.05,
      materialDensity: 7900,
    });
    expect(res.reference).toBeNull();
    expect(res.vccApplied).toBe(false);
  });
});
