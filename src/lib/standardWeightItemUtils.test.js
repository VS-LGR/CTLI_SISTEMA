import {
  isLoadBatchItem,
  loadBatchFieldsFromItem,
  loadBatchMaterialLabel,
} from "./standardWeightItemUtils";

describe("standardWeightItemUtils", () => {
  test("isLoadBatchItem identifica lote", () => {
    expect(isLoadBatchItem({ is_load_batch: true })).toBe(true);
    expect(isLoadBatchItem({ is_load_batch: false })).toBe(false);
    expect(isLoadBatchItem({})).toBe(false);
  });

  test("loadBatchFieldsFromItem mapeia campos do ponto", () => {
    const item = {
      id: "lot-1",
      is_load_batch: true,
      nominal_value: "190",
      load_batch_material_preset: "ferro",
    };
    expect(loadBatchFieldsFromItem(item)).toEqual({
      load_batch_weight_id: "lot-1",
      load_batch_nominal: "190",
      load_batch_material_preset: "ferro",
    });
    expect(loadBatchFieldsFromItem({ is_load_batch: false })).toBeNull();
  });

  test("loadBatchMaterialLabel resolve preset", () => {
    expect(loadBatchMaterialLabel("aco")).toMatch(/Aço/i);
    expect(loadBatchMaterialLabel("unknown")).toBe("unknown");
  });
});
