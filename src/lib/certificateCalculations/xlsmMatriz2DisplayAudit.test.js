/**
 * Auditoria display — compara MROUND JS vs valores extraídos Matriz (2).
 */
import audit from "./__fixtures__/xlsm-matriz2-audit.json";
import {
  roundReferenceForDisplay,
  roundAverageForDisplay,
  roundIndicationErrorFromRoundedInputs,
  roundExpandedUncertainty,
  formatVeffForDisplay,
} from "./certificateDisplayRounding";

describe("xlsm Matriz (2) display audit — todos os pontos", () => {
  audit.certificates.forEach((cert) => {
    cert.points
      .filter((p) => !p.calc.use_load_batch)
      .forEach((ptBlock) => {
        const { calc, display } = ptBlock;
        const id = `${cert.name} P${calc.point_number}`;
        test(`${id} — display MROUND`, () => {
          const d = calc.resolution ?? 0.0001;
          if (display.reference != null) {
            expect(roundReferenceForDisplay(calc.reference, d)).toBeCloseTo(display.reference, 4);
          }
          if (display.average != null) {
            expect(roundAverageForDisplay(calc.average, d)).toBeCloseTo(display.average, 4);
          }
          if (display.indication_error != null) {
            expect(roundIndicationErrorFromRoundedInputs(calc.average, calc.reference, d))
              .toBeCloseTo(display.indication_error, 4);
          }
          if (display.expanded_uncertainty != null) {
            expect(roundExpandedUncertainty(calc.expanded_uncertainty, d))
              .toBeCloseTo(display.expanded_uncertainty, 3);
          }
          if (display.veff != null) {
            expect(formatVeffForDisplay(calc.veff_raw)).toBe(display.veff);
          }
        });
      });
  });
});
