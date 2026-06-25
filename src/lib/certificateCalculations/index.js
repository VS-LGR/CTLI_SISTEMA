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
  standardUncertaintyUpFromWeightIds,
  driftUncertaintyUdFromWeightIds,
  resolveResolutionForNominal,
  resolveReadingsAfter,
  resolveReadingsBefore,
  coverageFactorFromNu,
  welchSatterthwaiteNuEff,
  truncateVeff,
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
  correctConventionalMassForBuoyancy,
  shouldApplyVccCorrection,
  AIR_DENSITY_TOLERANCE_MIN,
  AIR_DENSITY_TOLERANCE_MAX,
  REF_AIR_DENSITY,
  REF_SOLID_DENSITY,
} from "./conventionalMassCorrection";
export {
  calculateBuoyancyUncertainty,
  calculateBuoyancyUncertaintyFromPpm,
} from "./buoyancyCalculations";
export {
  MATERIAL_PRESETS,
  DEFAULT_MATERIAL_DENSITY,
  presetById,
  ppmFromPresetId,
  densityFromPresetId,
} from "./materialConstants";
export {
  roundExpandedUncertainty,
  roundIndicationError,
  formatVeffForDisplay,
} from "./certificateDisplayRounding";
export {
  determineInstrumentClass,
  calculateToleranceOiml,
  evaluatePointConformity,
  calculateConformityForCertificate,
} from "./conformityCalculations";

import {
  sumNominalFromWeightIds,
  calculateCalibrationPoint,
  standardUncertaintyUpFromWeightIds,
  driftUncertaintyUdFromWeightIds,
  resolveResolutionForNominal,
  resolveReadingsAfter,
} from "./pointCalculations";
import {
  sumConventionalFromWeightIds,
  calculateAirDensityFromEnvironmental,
} from "./environmentalCalculations";
import {
  calculateBuoyancyUncertainty,
  calculateBuoyancyUncertaintyFromPpm,
} from "./buoyancyCalculations";
import { DEFAULT_MATERIAL_DENSITY, ppmFromPresetId, densityFromPresetId } from "./materialConstants";
import { decimalPlacesForPoint } from "@/lib/scaleRegistrations/scaleRegistrationUtils";
import { decimalPlacesFromResolution, parseCalibrationNumber } from "./parseNumber";

function resolveMaterialDensity(point) {
  const d = parseCalibrationNumber(point.material_density);
  if (d.valid && d.value > 0) return d.value;
  if (point.material_preset) {
    const fromPreset = densityFromPresetId(point.material_preset);
    if (fromPreset) return fromPreset;
  }
  return DEFAULT_MATERIAL_DENSITY;
}

function resolveBuoyancyPpm(point) {
  const ppmFromPoint = parseCalibrationNumber(point.buoyancy_ppm);
  if (ppmFromPoint.valid && ppmFromPoint.value > 0) return ppmFromPoint.value;
  const presetPpm = ppmFromPresetId(point.material_preset);
  return presetPpm ?? 1;
}

function resolveUeForPoint(point, referenceGrams, environmental, unit) {
  const matDensity = resolveMaterialDensity(point);
  const vcGrams = unit === "kg" ? referenceGrams * 1000 : referenceGrams;

  const emp = calculateBuoyancyUncertainty({
    conventionalMass: vcGrams,
    materialDensity: matDensity,
    environmental: environmental || {},
    tbhReference: environmental?.tbh_reference || {},
  });

  if (emp.valid && emp.ue != null) {
    return { ue: unit === "kg" ? emp.ue / 1000 : emp.ue, method: emp.method, warning: "" };
  }

  const ppm = resolveBuoyancyPpm(point);
  const ppmRes = calculateBuoyancyUncertaintyFromPpm(vcGrams, ppm);
  if (ppmRes.valid && ppmRes.ue != null) {
    return {
      ue: unit === "kg" ? ppmRes.ue / 1000 : ppmRes.ue,
      method: "ppm",
      warning: emp.reason || "Empuxo calculado via PPM (ambientais incompletos)",
    };
  }

  return { ue: 0, method: "none", warning: ppmRes.reason || "Empuxo não calculado" };
}

export function calculateCertificatePoints(points, balance, weightItems = [], weightCerts = [], environmental = {}) {
  const unit = balance?.unidade || "g";
  const airDensityRes = calculateAirDensityFromEnvironmental(environmental);
  const airDensity = airDensityRes.valid ? airDensityRes.value : null;

  return (points || []).map((pt) => {
    const afterReadings = resolveReadingsAfter(pt);
    const hasData = pt.nominal_value || afterReadings.length || pt.reading1;
    if (!hasData) {
      return { ...pt, calc_status: "pendente", calc_error: "" };
    }

    const matDensity = resolveMaterialDensity(pt);
    const vvcOptions = { airDensity, materialDensity: matDensity, vccCorrection: true };

    let reference = pt.nominal_value;
    let vccApplied = false;
    if (pt.standard_weight_ids?.length) {
      const vvc = sumConventionalFromWeightIds(pt.standard_weight_ids, weightItems, unit, vvcOptions);
      if (vvc.valid) {
        reference = vvc.value;
        vccApplied = Boolean(vvc.vcc_correction_applied);
      }
    } else if (!reference && pt.standard_weight_ids?.length) {
      const sum = sumNominalFromWeightIds(pt.standard_weight_ids, weightItems);
      if (sum.valid) reference = sum.value;
    }

    const resolutionFromPoint = pt.resolution != null && String(pt.resolution).trim() !== ""
      ? String(pt.resolution)
      : null;
    const resolutionStr = resolutionFromPoint || resolveResolutionForNominal(reference ?? pt.nominal_value, balance, unit);

    const upRes = standardUncertaintyUpFromWeightIds(pt.standard_weight_ids, weightItems, unit);
    const udRes = driftUncertaintyUdFromWeightIds(pt.standard_weight_ids, weightItems, unit);
    if (!upRes.valid && upRes.reason) {
      return {
        ...pt,
        nominal_value: reference ?? pt.nominal_value,
        calc_status: "erro",
        calc_error: upRes.reason,
      };
    }
    if (!udRes.valid && udRes.reason) {
      return {
        ...pt,
        nominal_value: reference ?? pt.nominal_value,
        calc_status: "erro",
        calc_error: udRes.reason,
      };
    }

    const refNum = parseCalibrationNumber(reference);
    const ueRes = refNum.valid
      ? resolveUeForPoint(pt, refNum.value, environmental, unit)
      : { ue: 0, method: "none", warning: "" };

    const calc = calculateCalibrationPoint(
      { ...pt, nominal_value: reference },
      {
        resolution: resolutionStr,
        unit,
        referenceValue: reference,
        up: upRes.valid ? upRes.value : 0,
        ud: udRes.valid ? udRes.value : 0,
        ue: ueRes.ue,
      },
    );

    const decimalsFromResolution = decimalPlacesFromResolution(resolutionStr);
    const decimals = decimalsFromResolution ?? decimalPlacesForPoint(balance, pt.point_number || 1);

    const memory = {
      ...(calc.results.calculation_memory || {}),
      vcc_correction_applied: vccApplied,
      material_density: matDensity,
      buoyancy_method: ueRes.method,
      air_density: airDensity,
    };
    if (ueRes.warning) memory.buoyancy_warning = ueRes.warning;

    return {
      ...pt,
      nominal_value: reference ?? pt.nominal_value,
      calc_status: calc.calcStatus,
      calc_error: calc.calcError,
      display_decimals: decimals,
      ...calc.results,
      calculation_memory: memory,
    };
  });
}
