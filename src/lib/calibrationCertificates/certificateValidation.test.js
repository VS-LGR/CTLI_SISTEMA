import { validateBeforeEmit, validateBeforeCalculate } from "./certificateValidation";

describe("certificateValidation", () => {
  const baseCert = {
    collection_id: "coll-1",
    client_name: "Cliente",
    scale_serial: "SN-1",
    calibration_date: "2026-01-05",
    validity_date: "2027-01-05",
    executor_name: "Técnico",
    signatory_id: "sig-1",
    certificate_number: 10,
    status: "aprovado",
    is_preview_only: false,
  };

  const basePoints = [{ nominal_value: 100, reading1: 100, calc_status: "calculado" }];
  const baseStandards = [{ identification_code: "P1", valid_until: "2027-01-01" }];
  const baseEnv = { initial_temperature: "24", final_temperature: "25" };

  test("validateBeforeEmit passes with environmental data", () => {
    const r = validateBeforeEmit(baseCert, basePoints, baseStandards, baseEnv);
    expect(r.ok).toBe(true);
  });

  test("validateBeforeEmit fails without environmental data", () => {
    const r = validateBeforeEmit(baseCert, basePoints, baseStandards, {});
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.includes("ambientais"))).toBe(true);
  });

  test("validateBeforeEmit blocks preview certificates", () => {
    const r = validateBeforeEmit(
      { ...baseCert, is_preview_only: true },
      basePoints,
      baseStandards,
      baseEnv,
    );
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.includes("Prévia"))).toBe(true);
  });

  test("validateBeforeCalculate requires environmental readings", () => {
    const r = validateBeforeCalculate(baseCert, basePoints, baseStandards, {});
    expect(r.ok).toBe(false);
  });
});
