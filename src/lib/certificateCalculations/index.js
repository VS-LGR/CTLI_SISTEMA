export { parseCalibrationNumber, parseImportNumeric, toDbNumeric, formatCalcDisplay, decimalPlacesFromResolution, normalizeDecimalString } from "./parseNumber";
export {
  calculatePointAverage,
  calculateIndicationError,
  calculateRepeatability,
  calculateResolutionContribution,
  calculateStandardUncertaintyContribution,
  calculateExpandedUncertainty,
  calculateEccentricityError,
  calculateCalibrationPoint,
  sumNominalFromWeightIds,
  maxStandardUncertaintyPpm,
  standardUncertaintyAbsFromWeightIds,
  resolveResolutionForNominal,
  coverageFactorFromNu,
  welchSatterthwaiteNuEff,
} from "./pointCalculations";
export {
  determineInstrumentClass,
  calculateToleranceOiml,
  evaluatePointConformity,
  calculateConformityForCertificate,
} from "./conformityCalculations";

import {
  sumNominalFromWeightIds,
  maxStandardUncertaintyPpm,
  calculateCalibrationPoint,
  standardUncertaintyAbsFromWeightIds,
  resolveResolutionForNominal,
} from "./pointCalculations";
import { sumConventionalFromWeightIds } from "./environmentalCalculations";
import { decimalPlacesForPoint } from "@/lib/scaleRegistrations/scaleRegistrationUtils";
import { decimalPlacesFromResolution } from "./parseNumber";

export function calculateCertificatePoints(points, balance, weightItems = [], weightCerts = []) {
  const unit = balance?.unidade || "g";

  return (points || []).map((pt) => {
    const hasData = pt.nominal_value || pt.reading1 || pt.reading2 || pt.reading3;
    if (!hasData) {
      return { ...pt, calc_status: "pendente", calc_error: "" };
    }

    let nominal = pt.nominal_value;
    if (pt.standard_weight_ids?.length) {
      const vvc = sumConventionalFromWeightIds(pt.standard_weight_ids, weightItems, unit);
      if (vvc.valid) nominal = vvc.value;
    } else if (!nominal && pt.standard_weight_ids?.length) {
      const sum = sumNominalFromWeightIds(pt.standard_weight_ids, weightItems);
      if (sum.valid) nominal = sum.value;
    }

    const resolutionStr = resolveResolutionForNominal(nominal ?? pt.nominal_value, balance, unit);
    const ueAbs = standardUncertaintyAbsFromWeightIds(pt.standard_weight_ids, weightItems, unit);
    const ppm = maxStandardUncertaintyPpm(pt.standard_weight_ids, weightItems, weightCerts);
    const calc = calculateCalibrationPoint(
      { ...pt, nominal_value: nominal },
      {
        resolution: resolutionStr,
        unit,
        standardUncertaintyPpm: ppm,
        standardUncertaintyAbs: ueAbs.valid ? ueAbs.value : null,
      },
    );

    const decimalsFromResolution = decimalPlacesFromResolution(resolutionStr);
    const decimals = decimalsFromResolution ?? decimalPlacesForPoint(balance, pt.point_number || 1);

    return {
      ...pt,
      nominal_value: nominal ?? pt.nominal_value,
      calc_status: calc.calcStatus,
      calc_error: calc.calcError,
      display_decimals: decimals,
      ...calc.results,
    };
  });
}
