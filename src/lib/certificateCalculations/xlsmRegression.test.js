import golden from "./__fixtures__/xlsm-golden.json";
import { calculateCertificatePoints } from "./index";

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
      );
      const tol = testCase.tolerance ?? 0.002;

      if (Array.isArray(testCase.expected)) {
        testCase.expected.forEach((exp, idx) => {
          const pt = results[idx];
          expect(pt.calc_status).toBe("calculado");
          expect(num(pt.nominal_value)).toBeCloseTo(exp.nominal_value, 4);
          expect(num(pt.indication_error)).toBeCloseTo(exp.indication_error, 4);
          if (exp.expanded_uncertainty != null) {
            expect(num(pt.expanded_uncertainty)).toBeCloseTo(exp.expanded_uncertainty, tol);
          }
        });
        return;
      }

      const pt = results[0];
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
    });
  });
});
