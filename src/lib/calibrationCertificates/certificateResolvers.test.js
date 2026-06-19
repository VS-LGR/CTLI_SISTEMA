import {
  resolveScaleRegistration,
  resolveExecutor,
  mergeBalanceSnapshotFromScale,
} from "./certificateResolvers";

describe("certificateResolvers", () => {
  const scales = [
    { id: "s1", serial_number: "ABC123", end_customer_id: "c1", active: true, manufacturer: "TOLEDO" },
    { id: "s2", serial_number: "ABC123", end_customer_id: "c2", active: true },
  ];

  it("resolveScaleRegistration por série e cliente", () => {
    expect(resolveScaleRegistration("ABC123", "c1", scales)?.id).toBe("s1");
    expect(resolveScaleRegistration("ABC123", "c2", scales)?.id).toBe("s2");
  });

  it("resolveExecutor por FK", () => {
    const employees = [{ id: "e1", full_name: "Jaqueline Della Dea" }];
    const r = resolveExecutor({ controle: { executor_id: "e1" } }, employees);
    expect(r.executor_id).toBe("e1");
    expect(r.executor_name).toBe("Jaqueline Della Dea");
  });

  it("mergeBalanceSnapshotFromScale prioriza cadastro", () => {
    const merged = mergeBalanceSnapshotFromScale({ serie: "ABC123", fabricante: "" }, scales[0]);
    expect(merged.fabricante).toBe("TOLEDO");
    expect(merged.serie).toBe("ABC123");
  });
});
