import { mapColetaPointForDb, resolveLoadBatchForImport } from "./certificateImportSanitize";

describe("resolveLoadBatchForImport", () => {
  const repSnap = {
    aplicavel: true,
    linhas: [{ key: "l1_p1", valor_nominal: "190", leitura1: "210" }],
  };

  test("prioriza flags explícitos no ponto sobre verso vazio", () => {
    const pt = {
      use_load_batch: true,
      load_batch_formation: "l1_p1",
      load_batch_nominal: "200",
      load_batch_material_preset: "latão",
    };
    const res = resolveLoadBatchForImport(pt, 2, {});
    expect(res.use_load_batch).toBe(true);
    expect(res.load_batch_nominal).toBe("200");
    expect(res.load_batch_material_preset).toBe("latão");
  });

  test("fallback verso quando ponto sem flags", () => {
    const res = resolveLoadBatchForImport({ peso_nominal: "210" }, 2, repSnap);
    expect(res.use_load_batch).toBe(true);
    expect(res.load_batch_nominal).toBe("190");
  });

  test("mapColetaPointForDb grava lote explícito em P2", () => {
    const row = mapColetaPointForDb(
      {
        peso_nominal: "210",
        use_load_batch: true,
        load_batch_formation: "l1_p1",
        load_batch_nominal: "190",
      },
      2,
      [],
      {},
    );
    expect(row.use_load_batch).toBe(true);
    expect(row.load_batch_formation).toBe("l1_p1");
    expect(row.load_batch_nominal).toBe(190);
  });
});
