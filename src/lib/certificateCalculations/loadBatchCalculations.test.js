import {
  formationKeyForPoint,
  upLcFromTable01,
  errorMultiplierForFormation,
  referenceWithLoadBatch,
  buoyancyPpmCombined,
  buildFormationChain,
  applyLoadBatchFromColeta,
  upLcFromSpreadsheetFormula,
} from "./loadBatchCalculations";
import { calculateCertificatePoints } from "./index";

describe("loadBatchCalculations", () => {
  test("formationKeyForPoint", () => {
    expect(formationKeyForPoint(1, true)).toBeNull();
    expect(formationKeyForPoint(2, true)).toBe("l1_p1");
    expect(formationKeyForPoint(3, false)).toBeNull();
    expect(formationKeyForPoint(4, true)).toBe("l3_p1");
  });

  test("upLcFromTable01 — P2 usa uc(P1)", () => {
    const chain = { p1: { combinedUncertainty: 0.00031 } };
    const res = upLcFromTable01("l1_p1", chain, []);
    expect(res.value).toBeCloseTo(0.00031, 6);
    expect(res.source).toBe("p1");
  });

  test("upLcFromTable01 — fallback ponto anterior", () => {
    const calculated = [{
      point_number: 1,
      calculation_memory: { combinedUncertainty: 0.0005 },
    }];
    const res = upLcFromTable01("l1_p1", {}, calculated);
    expect(res.value).toBeCloseTo(0.0005, 6);
    expect(res.source).toBe("point_1");
  });

  test("referenceWithLoadBatch aplica multiplicador M da PR-7.6", () => {
    const res = referenceWithLoadBatch(100, null, "g", 2);
    expect(res.valid).toBe(true);
    expect(res.value).toBe(200);
    expect(res.method).toBe("multiplier");
  });

  test("referenceWithLoadBatch mantém soma legado quando M=1", () => {
    const res = referenceWithLoadBatch(20, 190, "g", 1);
    expect(res.valid).toBe(true);
    expect(res.value).toBe(210);
  });

  test("buoyancyPpmCombined usa ppm do lote sem somar novamente o V.C.", () => {
    expect(buoyancyPpmCombined(1, "ferro", 1)).toBe(2);
    expect(buoyancyPpmCombined(1, "aco", 1)).toBe(1);
    expect(buoyancyPpmCombined(1, "ferro", 0)).toBe(1);
    expect(buoyancyPpmCombined(1, "", 1)).toBe(1);
  });

  test("errorMultiplierForFormation", () => {
    expect(errorMultiplierForFormation("l1_p1")).toBe(2);
    expect(errorMultiplierForFormation("l2_p1")).toBe(3);
    expect(errorMultiplierForFormation("l1")).toBe(1);
    expect(errorMultiplierForFormation(null)).toBe(1);
  });

  test("applyLoadBatchFromColeta — P2+ só com linha da formação", () => {
    const snap = {
      linhas: [
        { key: "p1", leitura1: "210", valor_nominal: "" },
        { key: "l1_p1", valor_nominal: "190", leitura1: "210" },
      ],
    };
    const p2 = applyLoadBatchFromColeta(2, snap);
    expect(p2.use_load_batch).toBe(true);
    expect(p2.load_batch_formation).toBe("l1_p1");
    expect(p2.load_batch_nominal).toBe("190");
    const p1 = applyLoadBatchFromColeta(1, snap);
    expect(p1.use_load_batch).toBe(false);
    const p3 = applyLoadBatchFromColeta(3, snap);
    expect(p3.use_load_batch).toBe(false);
  });

  test("applyLoadBatchFromColeta — verso só P1 não ativa P2", () => {
    const snap = { linhas: [{ key: "p1", leitura1: "20" }] };
    expect(applyLoadBatchFromColeta(2, snap).use_load_batch).toBe(false);
  });

  test("buildFormationChain acumula pontos", () => {
    const pts = [
      { point_number: 1, use_load_batch: false, calculation_memory: { combinedUncertainty: 0.001 } },
      { point_number: 2, use_load_batch: true, load_batch_formation: "l1_p1", calculation_memory: { combinedUncertainty: 0.002 } },
    ];
    const chain = buildFormationChain(pts, {});
    expect(chain.p1.combinedUncertainty).toBe(0.001);
    expect(chain.l1_p1.combinedUncertainty).toBe(0.002);
  });

  test("upLcFromSpreadsheetFormula", () => {
    const v = upLcFromSpreadsheetFormula({ ua: 0.0001, ur: 0.00003, up: 0.0002, upP1: 0.0002, nReadings: 3 });
    expect(v).toBeGreaterThan(0);
  });
});

describe("load batch integration — uc inclui upLC", () => {
  test("P2 com lote tem uc maior que sem lote", () => {
    const basePoint = {
      point_number: 1,
      nominal_value: "100",
      standard_weight_ids: ["w100"],
      material_preset: "aco",
      reading1: "100.0001",
      reading2: "100.0001",
      reading3: "100.0001",
      resolution: "0.0001",
    };
    const p2NoBatch = {
      point_number: 2,
      nominal_value: "200",
      standard_weight_ids: ["w100"],
      use_load_batch: false,
      material_preset: "aco",
      reading1: "200.0001",
      reading2: "200.0001",
      reading3: "200.0001",
      resolution: "0.0001",
    };
    const p2WithBatch = {
      ...p2NoBatch,
      use_load_batch: true,
      load_batch_formation: "l1_p1",
      load_batch_nominal: 100,
      load_batch_conventional_value: "100",
      load_batch_expanded_uncertainty: "0.0004",
      load_batch_material_preset: "aco",
    };

    const balance = { unidade: "g", capacidade: "220", resolucao: "0.0001" };
    const weights = [{
      id: "w100",
      identification: "P100",
      nominal_value: "100",
      conventional_value: "100",
      expanded_uncertainty: "0.0004",
      coverage_factor: "2",
      unit: "g",
    }];
    const env = {
      initial_temperature: "24",
      final_temperature: "24",
      initial_humidity: "65",
      final_humidity: "58",
      initial_pressure: "935",
      final_pressure: "935",
    };

    const without = calculateCertificatePoints([basePoint, p2NoBatch], balance, weights, [], env);
    const withBatch = calculateCertificatePoints([basePoint, p2WithBatch], balance, weights, [], env);

    expect(without[1].calc_status).toBe("calculado");
    expect(withBatch[1].calc_status).toBe("calculado");
    expect(withBatch[1].calculation_memory.errorMultiplier).toBe(2);
    expect(withBatch[1].calculation_memory.vc_base).toBe(100);
    expect(withBatch[1].calculation_memory.up).toBeCloseTo(0.0002, 10);
    expect(withBatch[1].calculation_memory.upLC).toBeGreaterThan(0);
    expect(withBatch[1].calculation_memory.combinedUncertainty)
      .toBeGreaterThan(without[1].calculation_memory.combinedUncertainty);
    expect(Number(withBatch[1].nominal_value)).toBe(200);
    expect(withBatch[1].indication_error).toBeCloseTo(0.0001, 10);
  });

  test("P2 com lote reutiliza up calculado de P1 quando o ponto não repete pesos", () => {
    const points = [
      {
        point_number: 1,
        nominal_value: "100",
        material_preset: "aco",
        reading1: "100.0001",
        reading2: "100.0001",
        reading3: "100.0001",
        resolution: "0.0001",
      },
      {
        point_number: 2,
        nominal_value: "200",
        use_load_batch: true,
        load_batch_formation: "l1_p1",
        load_batch_nominal: "100",
        load_batch_expanded_uncertainty: "0.0004",
        material_preset: "aco",
        reading1: "200.0001",
        reading2: "200.0001",
        reading3: "200.0001",
        resolution: "0.0001",
      },
    ];
    const result = calculateCertificatePoints(
      points,
      { unidade: "g", capacidade: "220", resolucao: "0.0001" },
      [],
      [],
      {},
    );
    expect(result[1].calc_status).toBe("calculado");
    expect(result[1].calculation_memory.up).toBe(result[0].calculation_memory.up);
    expect(result[1].calculation_memory.upLC).toBe(result[0].calculation_memory.combinedUncertainty);
  });

  test("P2 com lote calcula ue por PPM sobre V.C. efetivo sem duplicar ppm", () => {
    const points = [
      {
        point_number: 1,
        nominal_value: "100",
        standard_weight_ids: ["w100"],
        material_preset: "aco",
        reading1: "100.0001",
        reading2: "100.0001",
        reading3: "100.0001",
        resolution: "0.0001",
      },
      {
        point_number: 2,
        nominal_value: "200",
        standard_weight_ids: ["w100"],
        use_load_batch: true,
        load_batch_formation: "l1_p1",
        load_batch_nominal: "100",
        material_preset: "aco",
        load_batch_material_preset: "aco",
        reading1: "200.0001",
        reading2: "200.0001",
        reading3: "200.0001",
        resolution: "0.0001",
      },
    ];
    const weights = [{
      id: "w100",
      identification: "P100",
      nominal_value: "100",
      conventional_value: "100",
      expanded_uncertainty: "0.0004",
      coverage_factor: "2",
      unit: "g",
    }];
    const result = calculateCertificatePoints(
      points,
      { unidade: "g", capacidade: "220", resolucao: "0.0001" },
      weights,
      [],
      {},
    );

    expect(result[1].calc_status).toBe("calculado");
    expect(result[1].calculation_memory.buoyancy_method).toBe("ppm");
    expect(result[1].calculation_memory.ppmEffective).toBe(1);
    expect(result[1].calculation_memory.ue).toBeCloseTo(200 / 1_000_000 / Math.sqrt(3), 12);
  });
});
