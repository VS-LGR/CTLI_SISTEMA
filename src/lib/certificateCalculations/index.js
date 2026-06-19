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
  resolveReadingsAfter,
  resolveReadingsBefore,
  coverageFactorFromNu,
  welchSatterthwaiteNuEff,
} from "./pointCalculations";
export {
  sumConventionalFromWeightIds,
  combinedExpandedUncertaintyFromWeightIds,
  environmentalAverage,
  environmentalUncertainty,
  calculateAirDensity,
  calculateAirDensityFromEnvironmental,
  formatAirDensityDisplay,
  ENV_UNCERTAINTY_CONSTANTS,
} from "./environmentalCalculations";
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
  resolveReadingsAfter,
} from "./pointCalculations";
import { sumConventionalFromWeightIds } from "./environmentalCalculations";
import { decimalPlacesForPoint } from "@/lib/scaleRegistrations/scaleRegistrationUtils";
import { decimalPlacesFromResolution, parseCalibrationNumber } from "./parseNumber";

export function calculateCertificatePoints(points, balance, weightItems = [], weightCerts = []) {
  const unit = balance?.unidade || "g";

  return (points || []).map((pt) => {
    const afterReadings = resolveReadingsAfter(pt);
    const hasData = pt.nominal_value || afterReadings.length || pt.reading1;
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

    const resolutionFromPoint = pt.resolution != null && String(pt.resolution).trim() !== ""
      ? String(pt.resolution)
      : null;
    const resolutionStr = resolutionFromPoint || resolveResolutionForNominal(nominal ?? pt.nominal_value, balance, unit);

    const ueAbs = standardUncertaintyAbsFromWeightIds(pt.standard_weight_ids, weightItems, unit);
    if (!ueAbs.valid && ueAbs.reason) {
      return {
        ...pt,
        nominal_value: nominal ?? pt.nominal_value,
        calc_status: "erro",
        calc_error: ueAbs.reason,
      };
    }

    const ppmFromPoint = parseCalibrationNumber(pt.buoyancy_ppm);
    const ppmFallback = maxStandardUncertaintyPpm(pt.standard_weight_ids, weightItems, weightCerts);
    const ppm = ppmFromPoint.valid ? ppmFromPoint.value : ppmFallback;

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
