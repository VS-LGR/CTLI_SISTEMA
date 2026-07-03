import { buildPointCalculationTrace } from "./calculationTrace";

describe("buildPointCalculationTrace", () => {
  test("gera passos com fórmulas e operandos", () => {
    const point = {
      point_number: 1,
      calc_status: "calculado",
      calculation_memory: {
        average: 210.0001,
        referenceValue: 210,
        indicationError: 0.0001,
        ua: 0,
        up: 0.0002,
        ud: 0.0002309,
        ue: 0.000051763,
        ur: 0.000029,
        combinedUncertainty: 0.000311,
        coverageFactor: 2,
        expandedUncertainty: 0.000622,
        expandedUncertaintyDisplay: 0.0007,
        degreesOfFreedom: 100,
        veffDisplay: "∞",
        resolution: "0.0001",
        air_density: 1.12,
        vc_uncorrected: 210,
        buoyancy_method: "ppm",
        ppmEffective: 1,
        readingCount: 3,
        calculationTrace: [],
      },
    };
    const { steps } = buildPointCalculationTrace(point, { unidade: "g" }, "g");
    expect(steps.length).toBeGreaterThan(5);
    expect(steps.some((s) => s.id === "uc")).toBe(true);
    expect(steps.some((s) => s.id === "U_display")).toBe(true);
    const uDisplay = steps.find((s) => s.id === "U_display");
    expect(uDisplay.formula).toBe("MROUND(Ue + (d/10)×4,4, d)");
    expect(uDisplay.expression).toMatch(/0\.000044/);
    expect(uDisplay.result).toBe(0.0007);
    const ucStep = steps.find((s) => s.id === "uc");
    expect(ucStep.expression).toMatch(/√\(/);
    expect(steps.some((s) => s.id === "vc_uncorrected")).toBe(true);
    expect(steps.some((s) => s.id === "vcc_skip")).toBe(true);
  });

  test("passo VCC explícito quando ρ_ar fora da faixa", () => {
    const { steps } = buildPointCalculationTrace({
      calculation_memory: {
        vc_uncorrected: 210,
        referenceValue: 209.998,
        air_density: 1.05,
        material_density: 7900,
        vcc_correction_applied: true,
        vcc_factor: 0.999,
      },
    }, {}, "g");
    expect(steps.some((s) => s.id === "vcc")).toBe(true);
    const vcc = steps.find((s) => s.id === "vcc");
    expect(vcc.formula).toMatch(/V\.C ×/);
  });

  test("uc com lote mostra upLC sem elevar ao quadrado", () => {
    const { steps } = buildPointCalculationTrace({
      calculation_memory: {
        ua: 0.004,
        up: 0.017,
        ud: 0.01963,
        ue: 0.000434,
        ur: 0.288675,
        upLC: 0.289848,
        combinedUncertainty: 0.611305,
      },
    }, {}, "kg");
    const uc = steps.find((s) => s.id === "uc");
    expect(uc.formula).toContain("+ upLC");
    expect(uc.expression).toContain("0.289848");
    expect(uc.expression).not.toContain("0.289848²");
  });

  test("EMP Validação 2026 — rastreio mostra X+Y e Urel sem mascarar zeros", () => {
    const empX = 6.5048e-14;
    const empY = 1.522e-14;
    const empUrel = 2.8332e-7;
    const { steps } = buildPointCalculationTrace({
      calculation_memory: {
        buoyancy_method: "emp",
        air_density: 1.09,
        empDeltaT: -1,
        empDeltaRh: -10,
        empUPaRel: 0.025981871,
        empMaterialDensityUsed: 7900,
        empX,
        empY,
        empUrel,
        empConventionalMass: 210,
        vc_uncorrected: 210,
        ue: 0.000059497,
      },
    }, {}, "g");

    const urelStep = steps.find((s) => s.id === "emp_Urel");
    expect(urelStep).toBeDefined();
    expect(urelStep.expression).toMatch(/X \+ Y =/);
    expect(urelStep.expression).not.toMatch(/0\.000000000000 \+ 0\.000000000000/);
    expect(urelStep.expression).toMatch(/×10/);
    expect(urelStep.resultFormat).toBe("emp");
    expect(urelStep.result).toBeCloseTo(empUrel, 12);

    const empuxo = steps.find((s) => s.id === "empuxo");
    expect(empuxo.formula).toMatch(/V\.C × Urel/);
  });
});
