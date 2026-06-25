/**
 * Auditoria de exibição — espelha cols O/R/V/Y/AA/AC da aba Certificado-RBC (RE-7.2B).
 */
import golden from "./__fixtures__/xlsm-golden.json";
import { calculateCertificatePoints } from "./index";
import { buildCertificatePdfViewModel } from "@/lib/certificatePdf/viewModel";

function certFromCase(testCase) {
  const points = calculateCertificatePoints(
    testCase.points,
    testCase.balance,
    testCase.weightItems || [],
    testCase.weightCerts || [],
    testCase.environmental || {},
  );
  return {
    certificate_type: "rbc",
    balance_snapshot: testCase.balance,
    environmental: testCase.environmental || {},
    points,
  };
}

describe("xlsm display audit — Certificado-RBC", () => {
  golden.cases
    .filter((c) => c.expected?.display && !Array.isArray(c.expected))
    .forEach((testCase) => {
      test(`${testCase.id} — repeatabilityRows alinha com planilha`, () => {
        const cert = certFromCase(testCase);
        const model = buildCertificatePdfViewModel(cert);
        const pn = testCase.points[0]?.point_number ?? 1;
        const row = model.repeatabilityRows[pn - 1];
        const exp = testCase.expected.display;

        expect(row).toBeTruthy();
        expect(row.empty).toBe(false);

        if (exp.reference != null) {
          expect(Number(String(row.reference.value).replace(",", "."))).toBeCloseTo(exp.reference, 4);
        }
        if (exp.average != null) {
          expect(Number(String(row.average.value).replace(",", "."))).toBeCloseTo(exp.average, 4);
        }
        if (exp.indication_error != null) {
          expect(Number(String(row.indicationError.value).replace(",", "."))).toBeCloseTo(exp.indication_error, 4);
        }
        if (exp.expanded_uncertainty != null) {
          expect(Number(String(row.expandedUncertainty.value).replace(",", "."))).toBeCloseTo(exp.expanded_uncertainty, 3);
        }
        if (exp.veff != null) {
          expect(row.veff).toBe(exp.veff);
        }
        if (exp.k != null) {
          expect(Number(String(row.k).replace(",", "."))).toBeCloseTo(exp.k, 2);
        }
      });
    });
});
