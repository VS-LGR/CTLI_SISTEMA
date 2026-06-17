export { parseCalibrationNumber, formatCalcDisplay } from "./parseNumber";
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
} from "./pointCalculations";
export {
  determineInstrumentClass,
  calculateToleranceOiml,
  evaluatePointConformity,
  calculateConformityForCertificate,
} from "./conformityCalculations";

import { sumNominalFromWeightIds, maxStandardUncertaintyPpm, calculateCalibrationPoint } from "./pointCalculations";

export function calculateCertificatePoints(points, balance, weightItems = [], weightCerts = []) {
  const unit = balance?.unidade || "g";
  const resolution = balance?.resolucao || "";

  return (points || []).map((pt) => {
    const hasData = pt.nominal_value || pt.reading1 || pt.reading2 || pt.reading3;
    if (!hasData) {
      return { ...pt, calc_status: "pendente", calc_error: "" };
    }

    let nominal = pt.nominal_value;
    if (!nominal && pt.standard_weight_ids?.length) {
      const sum = sumNominalFromWeightIds(pt.standard_weight_ids, weightItems);
      if (sum.valid) nominal = sum.value;
    }

    const ppm = maxStandardUncertaintyPpm(pt.standard_weight_ids, weightItems, weightCerts);
    const calc = calculateCalibrationPoint(
      { ...pt, nominal_value: nominal },
      { resolution, unit, standardUncertaintyPpm: ppm },
    );

    return {
      ...pt,
      nominal_value: nominal ?? pt.nominal_value,
      calc_status: calc.calcStatus,
      calc_error: calc.calcError,
      ...calc.results,
    };
  });
}
