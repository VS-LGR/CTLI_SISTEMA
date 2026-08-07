/**
 * Smoke: default de ciclos PR-7.2 Rev.06 §8.1.1 = 5.
 */
import {
  DEFAULT_WEIGHT_CYCLE_COUNT,
  emptyWeightItem,
  clampWeightCycleCount,
} from "./weightColetaSchema";
import {
  getWeightRbcObservations,
  getWeightRastreavelObservations,
} from "./weightLegalObservations";

describe("weightColetaSchema PR-7.2 cycles", () => {
  it("default cycle count is 5", () => {
    expect(DEFAULT_WEIGHT_CYCLE_COUNT).toBe(5);
    const item = emptyWeightItem();
    expect(item.cycle_count).toBe(5);
    expect(item.cycles).toHaveLength(5);
  });

  it("clamps to 3–10 for new inputs", () => {
    expect(clampWeightCycleCount(2)).toBe(3);
    expect(clampWeightCycleCount(12)).toBe(10);
    expect(clampWeightCycleCount(5)).toBe(5);
  });
});

describe("weightLegalObservations PR-7.2", () => {
  it("RBC cites 17025 and Calibração de Pesos", () => {
    const obs = getWeightRbcObservations().join(" ");
    expect(obs).toMatch(/PR-7\.2 Calibração de Pesos/);
    expect(obs).toMatch(/17025:2017/);
    expect(obs).not.toMatch(/Calibração de Balanças/);
  });

  it("rastreável cites método ABA / PR-7.2 Pesos", () => {
    const obs = getWeightRastreavelObservations().join(" ");
    expect(obs).toMatch(/comparação direta \(ABA\)/);
    expect(obs).toMatch(/PR-7\.2 Calibração de Pesos/);
  });
});
