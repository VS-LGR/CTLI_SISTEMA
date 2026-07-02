import {
  coletaPointToPanelPoint,
  panelPointToColetaPoint,
  syncColetaPontosFromRepeatability,
  syncRepeatabilityFromPanelPoint,
} from "./certificatePointUtils";

describe("certificatePointUtils — lote de carga round-trip", () => {
  test("panel → coleta → panel preserva flags P2", () => {
    const panel = {
      point_number: 2,
      nominal_value: "210",
      readings_after: ["210.0001", "210.0001", "210.0001"],
      standard_weight_ids: [],
      use_load_batch: true,
      load_batch_formation: "l1_p1",
      load_batch_nominal: "190",
      load_batch_material_preset: "aco",
      error_multiplier: "1",
    };
    const coleta = panelPointToColetaPoint(panel);
    expect(coleta.use_load_batch).toBe(true);
    expect(coleta.load_batch_formation).toBe("l1_p1");
    expect(coleta.load_batch_nominal).toBe("190");
    expect(coleta.load_batch_material_preset).toBe("aco");

    const back = coletaPointToPanelPoint(coleta, 2);
    expect(back.use_load_batch).toBe(true);
    expect(back.load_batch_formation).toBe("l1_p1");
    expect(back.load_batch_nominal).toBe("190");
    expect(back.load_batch_material_preset).toBe("aco");
  });

  test("syncColetaPontosFromRepeatability ativa P2 via verso L1+P1", () => {
    const pontos = [{ peso_nominal: "20" }, { peso_nominal: "210" }];
    const repSnap = {
      aplicavel: true,
      linhas: [{ key: "l1_p1", valor_nominal: "190", leitura1: "210" }],
    };
    const synced = syncColetaPontosFromRepeatability(pontos, repSnap);
    expect(synced[1].use_load_batch).toBe(true);
    expect(synced[1].load_batch_formation).toBe("l1_p1");
    expect(synced[1].load_batch_nominal).toBe("190");
  });

  test("syncRepeatabilityFromPanelPoint preenche linha l1_p1", () => {
    const payload = { verso: { repetitividade: { aplicavel: true, linhas: [] } } };
    const next = syncRepeatabilityFromPanelPoint(payload, 2, {
      use_load_batch: true,
      load_batch_formation: "l1_p1",
      load_batch_nominal: "190",
      load_batch_material_preset: "ferro",
    });
    const line = next.verso.repetitividade.linhas.find((l) => l.key === "l1_p1");
    expect(line.valor_nominal).toBe("190");
    expect(line.material_preset).toBe("ferro");
  });
});
