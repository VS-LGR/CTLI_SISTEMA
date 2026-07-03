import {
  filterAndSortWeightItems,
  sortWeightItems,
  nominalSortGrams,
} from "./pesoPadraoPickerUtils";

describe("pesoPadraoPickerUtils", () => {
  const items = [
    { id: "1", identification: "RF-11-02", nominal_value: "20000", unit: "g" },
    { id: "2", identification: "RF-02-1g", nominal_value: "1", unit: "g" },
    { id: "3", identification: "RF-02-200g", nominal_value: "200", unit: "g" },
  ];

  test("ordena por peso nominal ascendente", () => {
    const sorted = sortWeightItems(items, "nominal_asc");
    expect(sorted.map((i) => i.id)).toEqual(["2", "3", "1"]);
  });

  test("ordena por peso nominal descendente", () => {
    const sorted = sortWeightItems(items, "nominal_desc");
    expect(sorted.map((i) => i.id)).toEqual(["1", "3", "2"]);
  });

  test("filtra por identificação", () => {
    const filtered = filterAndSortWeightItems(items, { query: "RF-02", sortKey: "nominal_asc" });
    expect(filtered).toHaveLength(2);
    expect(filtered[0].id).toBe("2");
  });

  test("filtra apenas lotes de carga", () => {
    const withLots = [
      ...items,
      { id: "4", identification: "L-190", nominal_value: "190", unit: "g", is_load_batch: true, load_batch_material_preset: "aco" },
    ];
    const lots = filterAndSortWeightItems(withLots, { kind: "load_batches" });
    expect(lots).toHaveLength(1);
    expect(lots[0].id).toBe("4");
  });

  test("exclui lotes no filtro de pesos padrão", () => {
    const mixed = [
      items[0],
      { id: "4", identification: "L-190", nominal_value: "190", unit: "g", is_load_batch: true },
    ];
    const weights = filterAndSortWeightItems(mixed, { kind: "weights" });
    expect(weights.every((i) => !i.is_load_batch)).toBe(true);
    expect(weights).toHaveLength(1);
  });

  test("nominalSortGrams converte unidades", () => {
    expect(nominalSortGrams({ nominal_value: "1", unit: "kg" })).toBe(1000);
    expect(nominalSortGrams({ nominal_value: "500", unit: "mg" })).toBe(0.5);
  });
});
