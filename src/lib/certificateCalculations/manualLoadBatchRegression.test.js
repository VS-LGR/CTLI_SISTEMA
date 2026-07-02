import golden from "./__fixtures__/manual-load-batch-golden.json";
import { upLcFromTable01 } from "./loadBatchCalculations";

describe("Manual.xls — regressão lote de carga (Estudo Lote P2)", () => {
  test("fixture contém blocos P2–P10", () => {
    expect(golden.loadBatchBlocks.length).toBeGreaterThanOrEqual(9);
    expect(golden.loadBatchBlocks[0].point).toBe(2);
    expect(golden.loadBatchBlocks[0].totalUcWithLoadBatch).toBeCloseTo(0.409683, 4);
  });

  test("P2 upLC = uc(P1) conforme Tabela 01 / Manual", () => {
    const p2Block = golden.loadBatchBlocks.find((b) => b.point === 2);
    const ucP1 = p2Block.upLcSourceValue;
    const chain = { p1: { combinedUncertainty: ucP1 } };
    const res = upLcFromTable01("l1_p1", chain, []);
    expect(res.value).toBeCloseTo(ucP1, 10);
    expect(res.source).toBe("p1");
  });

  test("P3 totalUc com lote conforme golden Manual", () => {
    const p3 = golden.loadBatchBlocks.find((b) => b.point === 3);
    expect(p3.totalUcWithLoadBatch).toBeCloseTo(0.502108, 4);
    expect(p3.upLcSourceLabel).toContain("P2");
  });

  test("fallback Tabela 01 — P3 sem verso usa uc(P2) calculado", () => {
    const ucP2 = golden.ucWithoutLoadBatch;
    const calculated = [
      { point_number: 2, calculation_memory: { combinedUncertainty: ucP2 } },
    ];
    const res = upLcFromTable01("l2_p1", {}, calculated);
    expect(res.value).toBeCloseTo(ucP2, 8);
    expect(res.source).toBe("point_2");
  });
});
