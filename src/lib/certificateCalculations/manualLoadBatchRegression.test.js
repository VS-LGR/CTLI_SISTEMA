import golden from "./__fixtures__/manual-load-batch-golden.json";
import { calculateCertificatePoints } from "./index";
import { upLcFromTable01 } from "./loadBatchCalculations";
import { loadBatchFieldsFromItem } from "../standardWeightItemUtils";

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

  test("integração PR-7.6 — P2 L1+P1 usa M=2 e upLC=uc(P1)", () => {
    const weights = [{
      id: "p1",
      identification: "P1",
      nominal_value: "100",
      conventional_value: "100",
      expanded_uncertainty: "0.0004",
      coverage_factor: "2",
      unit: "g",
    }];
    const points = [
      {
        point_number: 1,
        nominal_value: "100",
        standard_weight_ids: ["p1"],
        material_preset: "aco",
        resolution: "0.0001",
        reading1: "100.0001",
        reading2: "100.0001",
        reading3: "100.0001",
      },
      {
        point_number: 2,
        nominal_value: "200",
        standard_weight_ids: ["p1"],
        use_load_batch: true,
        load_batch_formation: "l1_p1",
        load_batch_nominal: "100",
        load_batch_conventional_value: "100",
        load_batch_expanded_uncertainty: "0.0004",
        material_preset: "aco",
        resolution: "0.0001",
        reading1: "200.0001",
        reading2: "200.0001",
        reading3: "200.0001",
      },
    ];

    const calculated = calculateCertificatePoints(
      points,
      { unidade: "g", capacidade: "220", resolucao: "0.0001" },
      weights,
      [],
      {},
    );

    const p1 = calculated[0];
    const p2 = calculated[1];
    expect(p2.calc_status).toBe("calculado");
    expect(p2.nominal_value).toBeCloseTo(200, 10);
    expect(p2.indication_error).toBeCloseTo(0.0001, 10);
    expect(p2.calculation_memory.errorMultiplier).toBe(2);
    expect(p2.calculation_memory.upLC).toBeCloseTo(p1.calculation_memory.combinedUncertainty, 10);
    expect(p2.calculation_memory.up).toBeCloseTo(p1.calculation_memory.up, 10);
  });

  test("balança kg — lote cadastrado em g é convertido antes do cálculo", () => {
    const weights = [{
      id: "p1000",
      identification: "P1000",
      nominal_value: "1000",
      conventional_value: "1000",
      expanded_uncertainty: "0.0004",
      coverage_factor: "2",
      unit: "g",
    }];
    const lot = {
      id: "lot1000",
      is_load_batch: true,
      nominal_value: "1000",
      conventional_value: "1000",
      expanded_uncertainty: "0.0004",
      unit: "g",
    };
    const lotFields = loadBatchFieldsFromItem(lot, "kg");
    const calculated = calculateCertificatePoints(
      [
        {
          point_number: 1,
          nominal_value: "1",
          standard_weight_ids: ["p1000"],
          material_preset: "aco",
          resolution: "0.0001",
          reading1: "1.0001",
          reading2: "1.0001",
          reading3: "1.0001",
        },
        {
          point_number: 2,
          nominal_value: "2",
          standard_weight_ids: ["p1000"],
          use_load_batch: true,
          load_batch_formation: "l1_p1",
          ...lotFields,
          material_preset: "aco",
          resolution: "0.0001",
          reading1: "2.0001",
          reading2: "2.0001",
          reading3: "2.0001",
        },
      ],
      { unidade: "kg", capacidade: "2", resolucao: "0.0001" },
      weights,
      [],
      {},
    );

    const p2 = calculated[1];
    expect(p2.calc_status).toBe("calculado");
    expect(p2.nominal_value).toBeCloseTo(2, 10);
    expect(p2.indication_error).toBeCloseTo(0.0001, 10);
    expect(p2.calculation_memory.vc_base).toBeCloseTo(1, 10);
    expect(p2.calculation_memory.load_batch_conventional_value).toBe("1");
    expect(p2.calculation_memory.up).toBeCloseTo(0.0000002, 12);
  });
});
