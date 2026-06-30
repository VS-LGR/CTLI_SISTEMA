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

  test("validateBeforeEmit permite emissão com tolerância excedida (aviso)", () => {
    const r = validateBeforeEmit(
      {
        ...baseCert,
        balance_snapshot: { unidade: "g", point_max_tolerances: [{ nominal_value: "200", unit: "g", max_tolerance: "0,05" }] },
        conformity: { general_max_tolerance_result: "alerta", max_tolerance_point_results: [] },
      },
      [{
        point_number: 1,
        nominal_value: "200",
        reading1: "200.1",
        calc_status: "calculado",
        indication_error: 0.08,
        expanded_uncertainty: 0.02,
      }],
      baseStandards,
      baseEnv,
    );
    expect(r.ok).toBe(true);
    expect(r.warnings.length).toBeGreaterThan(0);
    expect(r.warnings[0]).toContain("tolerância máxima");
  });
});
