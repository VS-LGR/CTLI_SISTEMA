import {
  isLoadBatchItem,
  loadBatchFieldsFromItem,
} from "./standardWeightItemUtils";

describe("standardWeightItemUtils", () => {
  test("isLoadBatchItem identifica lote", () => {
    expect(isLoadBatchItem({ is_load_batch: true })).toBe(true);
    expect(isLoadBatchItem({ is_load_batch: false })).toBe(false);
    expect(isLoadBatchItem({})).toBe(false);
  });

  test("loadBatchFieldsFromItem mapeia V.N., V.V.C. e Ue (sem material)", () => {
    const item = {
      id: "lot-1",
      is_load_batch: true,
      nominal_value: "190",
      conventional_value: "190,0002",
      expanded_uncertainty: "0,0005",
    };
    expect(loadBatchFieldsFromItem(item)).toEqual({
      load_batch_weight_id: "lot-1",
      load_batch_nominal: "190",
      load_batch_conventional_value: "190,0002",
      load_batch_expanded_uncertainty: "0,0005",
    });
    expect(loadBatchFieldsFromItem({ is_load_batch: false })).toBeNull();
  });

  test("loadBatchFieldsFromItem converte lote cadastrado para unidade alvo", () => {
    const item = {
      id: "lot-kg",
      is_load_batch: true,
      nominal_value: "1000",
      conventional_value: "1000,2",
      expanded_uncertainty: "0,4",
      unit: "g",
    };
    expect(loadBatchFieldsFromItem(item, "kg")).toEqual({
      load_batch_weight_id: "lot-kg",
      load_batch_nominal: "1",
      load_batch_conventional_value: "1.0002",
      load_batch_expanded_uncertainty: "0.0004",
    });
  });
});
