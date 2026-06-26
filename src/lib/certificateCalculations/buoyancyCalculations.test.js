import {
  calculateBuoyancyUncertainty,
  calculateBuoyancyUncertaintyFromPpm,
  resolveEmpMaterialDensity,
} from "./buoyancyCalculations";

/** Ambientais que reproduzem Empuxo.CSV Validação 2026 (ΔT=−1, ΔRH=−10, ρ_ar=1,09). */
const ENV_VALIDACAO_2026 = {
  initial_temperature: "24",
  final_temperature: "23",
  initial_humidity: "65",
  final_humidity: "55",
  initial_pressure: "935",
  final_pressure: "935",
};

describe("buoyancyCalculations", () => {
  test("EMP.P1 — Validação 2025 ue ≈ 0,000051763", () => {
    const res = calculateBuoyancyUncertainty({
      conventionalMass: 210,
      materialDensity: 7900,
      environmental: {
        initial_temperature: "24",
        final_temperature: "24",
        initial_humidity: "65",
        final_humidity: "58",
        initial_pressure: "935",
        final_pressure: "935",
      },
    });
    expect(res.valid).toBe(true);
    expect(res.method).toBe("emp");
    expect(res.ue).toBeCloseTo(0.000051763, 5);
  });

  test("EMP.P1 — Validação 2026 ue ≈ 0,000059497", () => {
    const res = calculateBuoyancyUncertainty({
      conventionalMass: 210,
      materialDensity: 7900,
      environmental: ENV_VALIDACAO_2026,
    });
    expect(res.valid).toBe(true);
    expect(res.method).toBe("emp");
    expect(res.memory.deltaT).toBeCloseTo(-1, 4);
    expect(res.memory.deltaRh).toBeCloseTo(-10, 4);
    expect(res.memory.rhoAir).toBeCloseTo(1.09, 2);
    expect(res.memory.empX).toBeGreaterThan(0);
    expect(res.urel).toBeCloseTo(2.8332e-7, 6);
    expect(res.ue).toBeCloseTo(0.000059497, 5);
  });

  test("guarda ρ_mat=8000 — corrige para 7900 e evita X=0", () => {
    const guard = resolveEmpMaterialDensity(8000);
    expect(guard.density).toBe(7900);
    expect(guard.correctedFromReference).toBe(true);

    const res = calculateBuoyancyUncertainty({
      conventionalMass: 210,
      materialDensity: 8000,
      environmental: ENV_VALIDACAO_2026,
    });
    expect(res.warning).toMatch(/8000/);
    expect(res.memory.rhoMat).toBe(7900);
    expect(res.memory.empX).toBeGreaterThan(0);
    expect(res.ue).toBeCloseTo(0.000059497, 5);
    expect(res.ue / 0.000028).toBeGreaterThan(1.5);
  });

  test("anti-regressão — cenário incorreto X=0 (ρ_mat=pc, ΔT=0, ΔRH=0) ≈ 0,000028", () => {
    const rhoAir = 1.08;
    const vc = 210;
    const y = ((rhoAir - 1.2) ** 2) * (70 ** 2) / (8000 ** 4);
    const urel = Math.sqrt(y);
    const ueWrong = vc * urel;
    expect(ueWrong).toBeCloseTo(0.000028, 4);

    const res = calculateBuoyancyUncertainty({
      conventionalMass: 210,
      materialDensity: 7900,
      environmental: ENV_VALIDACAO_2026,
    });
    expect(res.memory.empX).toBeGreaterThan(0);
    expect(res.ue).toBeGreaterThan(ueWrong * 1.5);
  });

  test("memória EMP completa", () => {
    const res = calculateBuoyancyUncertainty({
      conventionalMass: 210,
      materialDensity: 7900,
      environmental: ENV_VALIDACAO_2026,
    });
    expect(res.memory).toMatchObject({
      deltaT: expect.any(Number),
      deltaRh: expect.any(Number),
      uT: expect.any(Number),
      uRh: expect.any(Number),
      uPaRel: expect.any(Number),
      termInvDiffSq: expect.any(Number),
      termAirDelta: expect.any(Number),
      empX: expect.any(Number),
      empY: expect.any(Number),
      urel: expect.any(Number),
    });
  });

  test("PPM fallback — aço 1 ppm", () => {
    const res = calculateBuoyancyUncertaintyFromPpm(1000, 1);
    expect(res.valid).toBe(true);
    expect(res.ue).toBeCloseTo((1000 * 1e-6) / Math.sqrt(3), 8);
  });

  test("EMP.P1 requer ambientais completos", () => {
    const res = calculateBuoyancyUncertainty({
      conventionalMass: 100,
      materialDensity: 7900,
      environmental: {},
    });
    expect(res.valid).toBe(false);
    expect(res.needsFallback).toBe(true);
  });
});
