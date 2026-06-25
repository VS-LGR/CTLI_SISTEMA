import golden from "./__fixtures__/xlsm-golden.json";
import { calculateCertificatePoints, buildCertificatePointDisplay } from "./index";

function num(v) {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

describe("xlsm golden regression", () => {
  golden.cases.forEach((testCase) => {
    test(testCase.id, () => {
      const results = calculateCertificatePoints(
        testCase.points,
        testCase.balance,
        testCase.weightItems || [],
        testCase.weightCerts || [],
        testCase.environmental || {},
      );
      const tol = testCase.tolerance ?? 0.002;

      if (Array.isArray(testCase.expected)) {
        testCase.expected.forEach((exp) => {
          const pt = results.find((r) => r.point_number === exp.point_number) || results[exp.point_number - 1];
          expect(pt.calc_status).toBe(exp.calc_status || "calculado");
          if (exp.memory?.upLC_gt != null) {
            expect(pt.calculation_memory.upLC).toBeGreaterThan(exp.memory.upLC_gt);
          }
          if (exp.uc_gt_p1) {
            const p1 = results.find((r) => r.point_number === 1);
            expect(pt.calculation_memory.combinedUncertainty)
              .toBeGreaterThan(p1.calculation_memory.combinedUncertainty);
          }
        });
        return;
      }

      const pt = results.find((r) => r.point_number === testCase.points[0]?.point_number) || results[0];
      expect(pt.calc_status).toBe("calculado");
      expect(num(pt.nominal_value)).toBeCloseTo(testCase.expected.nominal_value, 4);
      expect(num(pt.indication_error)).toBeCloseTo(testCase.expected.indication_error, 4);

      if (testCase.expected.error_before_adjustment != null) {
        expect(num(pt.error_before_adjustment)).toBeCloseTo(testCase.expected.error_before_adjustment, 4);
      }
      if (testCase.expected.expanded_uncertainty != null) {
        expect(num(pt.expanded_uncertainty)).toBeCloseTo(testCase.expected.expanded_uncertainty, tol);
      }
      if (testCase.expected.coverage_factor != null) {
        expect(num(pt.coverage_factor)).toBeCloseTo(testCase.expected.coverage_factor, 2);
      }
      if (testCase.expected.degrees_of_freedom != null) {
        expect(num(pt.degrees_of_freedom)).toBeCloseTo(testCase.expected.degrees_of_freedom, 0);
      }
      if (testCase.expected.memory) {
        const mem = pt.calculation_memory || {};
        if (testCase.expected.memory.up != null) {
          expect(mem.up).toBeCloseTo(testCase.expected.memory.up, 4);
        }
        if (testCase.expected.memory.ud != null) {
          expect(mem.ud).toBeCloseTo(testCase.expected.memory.ud, 4);
        }
        if (testCase.expected.memory.ue != null) {
          expect(mem.ue).toBeCloseTo(testCase.expected.memory.ue, 5);
        }
        if (testCase.expected.memory.ur != null) {
          expect(mem.ur).toBeCloseTo(testCase.expected.memory.ur, 5);
        }
      }
      if (testCase.expected.display) {
        const display = buildCertificatePointDisplay(pt, testCase.balance, testCase.balance?.unidade || "g");
        const mem = pt.calculation_memory || {};
        const exp = testCase.expected.display;
        if (exp.reference != null) expect(display.reference).toBeCloseTo(exp.reference, 4);
        if (exp.average != null) expect(display.average).toBeCloseTo(exp.average, 4);
        if (exp.indication_error != null) expect(display.indicationError).toBeCloseTo(exp.indication_error, 4);
        if (exp.expanded_uncertainty != null) expect(display.expandedUncertainty).toBeCloseTo(exp.expanded_uncertainty, 4);
        if (exp.veff != null) expect(display.veff).toBe(exp.veff);
        if (exp.k != null) expect(Number(pt.coverage_factor)).toBeCloseTo(exp.k, 2);
        if (exp.referenceDisplay != null) expect(mem.referenceDisplay).toBeCloseTo(exp.referenceDisplay, 4);
        if (exp.expandedUncertaintyDisplay != null) {
          expect(mem.expandedUncertaintyDisplay).toBeCloseTo(exp.expandedUncertaintyDisplay, 4);
        }
      }
    });
  });
});
