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
  veffForDbStorage,
  VEFF_INFINITE_SENTINEL,
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
  mround,
  roundReferenceForDisplay,
  roundAverageForDisplay,
  roundIndicationErrorFromRoundedInputs,
  roundExpandedUncertainty,
  roundIndicationError,
  formatVeffForDisplay,
  resolvePointVeff,
  resolvePointVeffRaw,
  enrichPointVeffForStorage,
  enrichCertificatePointsForDisplay,
  resolveCertificateResolution,
  resolveDisplayResolution,
  buildCertificatePointDisplay,
} from "./certificateDisplayRounding";
export {
  determineInstrumentClass,
  calculateToleranceOiml,
  evaluatePointConformity,
  calculateConformityForCertificate,
} from "./conformityCalculations";
export {
  formationKeyForPoint,
  upLcFromTable01,
  errorMultiplierForFormation,
  referenceWithLoadBatch,
  buoyancyPpmCombined,
  buildFormationChain,
  applyLoadBatchFromColeta,
  upLcFromSpreadsheetFormula,
} from "./loadBatchCalculations";
export { buildPointCalculationTrace } from "./calculationTrace";

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
import { buildCertificatePointDisplay, resolveCertificateResolution } from "./certificateDisplayRounding";
import {
  formationKeyForPoint,
  upLcFromTable01,
  errorMultiplierForFormation,
  referenceWithLoadBatch,
  buoyancyPpmCombined,
  buildFormationChain,
  upLcFromSpreadsheetFormula,
} from "./loadBatchCalculations";
import { buildPointCalculationTrace } from "./calculationTrace";
import { driftFromWeightItem } from "@/lib/standardWeightCalculations";

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
  const basePpm = ppmFromPoint.valid && ppmFromPoint.value > 0 ? ppmFromPoint.value : null;
  const presetPpm = ppmFromPresetId(point.material_preset);
  const weightPpm = basePpm ?? presetPpm ?? 1;

  if (point.use_load_batch && point.load_batch_material_preset) {
    return buoyancyPpmCombined(weightPpm, point.load_batch_material_preset, 1);
  }
  return weightPpm;
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
    return {
      ue: unit === "kg" ? emp.ue / 1000 : emp.ue,
      method: emp.method,
      urel: emp.urel,
      ppmEffective: resolveBuoyancyPpm(point),
      warning: "",
    };
  }

  const ppm = resolveBuoyancyPpm(point);
  const ppmRes = calculateBuoyancyUncertaintyFromPpm(vcGrams, ppm);
  if (ppmRes.valid && ppmRes.ue != null) {
    return {
      ue: unit === "kg" ? ppmRes.ue / 1000 : ppmRes.ue,
      method: "ppm",
      urel: ppmRes.urel,
      ppmEffective: ppm,
      warning: emp.reason || "Empuxo calculado via PPM (ambientais incompletos)",
    };
  }

  return { ue: 0, method: "none", urel: null, warning: ppmRes.reason || "Empuxo não calculado" };
}

function buildWeightContributions(weightIds, weightItems, unit) {
  const SQRT3 = Math.sqrt(3);
  return (weightIds || []).map((id) => {
    const item = weightItems.find((w) => w.id === id);
    if (!item) return null;
    const ue = parseCalibrationNumber(item.expanded_uncertainty);
    const k = parseCalibrationNumber(item.coverage_factor);
    const kVal = k.valid && k.value > 0 ? k.value : 2;
    const drift = driftFromWeightItem(item);
    let uFromUe = ue.valid ? ue.value / kVal : null;
    let uFromDrift = drift.valid ? Math.abs(drift.value) / SQRT3 : null;
    if (unit === "kg" && uFromUe != null) uFromUe /= 1000;
    if (unit === "kg" && uFromDrift != null) uFromDrift /= 1000;
    return {
      identification: item.identification,
      nominal: item.nominal_value,
      vvc: item.conventional_value,
      unit: item.unit || unit,
      uFromUe,
      uFromDrift,
    };
  }).filter(Boolean);
}

export function calculateCertificatePoints(points, balance, weightItems = [], weightCerts = [], environmental = {}, options = {}) {
  const unit = balance?.unidade || "g";
  const airDensityRes = calculateAirDensityFromEnvironmental(environmental);
  const airDensity = airDensityRes.valid ? airDensityRes.value : null;
  const repeatabilitySnapshot = options.repeatabilitySnapshot || {};

  const sorted = [...(points || [])].sort((a, b) => (a.point_number || 0) - (b.point_number || 0));
  const calculated = [];
  const formationChain = buildFormationChain(calculated, repeatabilitySnapshot);

  for (const pt of sorted) {
    const afterReadings = resolveReadingsAfter(pt);
    const hasData = pt.nominal_value || afterReadings.length || pt.reading1;
    if (!hasData) {
      calculated.push({ ...pt, calc_status: "pendente", calc_error: "" });
      continue;
    }

    const matDensity = resolveMaterialDensity(pt);
    const vvcOptions = { airDensity, materialDensity: matDensity, vccCorrection: true };

    let weightReference = pt.nominal_value;
    let vccApplied = false;
    if (pt.standard_weight_ids?.length) {
      const vvc = sumConventionalFromWeightIds(pt.standard_weight_ids, weightItems, unit, vvcOptions);
      if (vvc.valid) {
        weightReference = vvc.value;
        vccApplied = Boolean(vvc.vcc_correction_applied);
      }
    } else if (!weightReference && pt.standard_weight_ids?.length) {
      const sum = sumNominalFromWeightIds(pt.standard_weight_ids, weightItems);
      if (sum.valid) weightReference = sum.value;
    }

    const useLoadBatch = Boolean(pt.use_load_batch);
    const formationKey = pt.load_batch_formation || formationKeyForPoint(pt.point_number, useLoadBatch);
    if (useLoadBatch && pt.load_batch_nominal != null && !pt.standard_weight_ids?.length) {
      const lot = parseCalibrationNumber(pt.load_batch_nominal);
      const nom = parseCalibrationNumber(weightReference);
      if (lot.valid && nom.valid && nom.value >= lot.value) {
        weightReference = nom.value - lot.value;
      }
    }
    let reference = weightReference;
    if (useLoadBatch && pt.load_batch_nominal != null) {
      const refWithLot = referenceWithLoadBatch(weightReference, pt.load_batch_nominal, unit);
      if (refWithLot.valid) reference = refWithLot.value;
    }

    const resolutionStr = resolveCertificateResolution(
      { ...pt, nominal_value: reference ?? pt.nominal_value },
      balance,
      unit,
      { preferMemory: false },
    );

    const upRes = standardUncertaintyUpFromWeightIds(pt.standard_weight_ids, weightItems, unit);
    const udRes = driftUncertaintyUdFromWeightIds(pt.standard_weight_ids, weightItems, unit);
    if (!upRes.valid && upRes.reason) {
      calculated.push({
        ...pt,
        nominal_value: reference ?? pt.nominal_value,
        calc_status: "erro",
        calc_error: upRes.reason,
      });
      continue;
    }
    if (!udRes.valid && udRes.reason) {
      calculated.push({
        ...pt,
        nominal_value: reference ?? pt.nominal_value,
        calc_status: "erro",
        calc_error: udRes.reason,
      });
      continue;
    }

    const refNum = parseCalibrationNumber(reference);
    const ueRes = refNum.valid
      ? resolveUeForPoint(pt, refNum.value, environmental, unit)
      : { ue: 0, method: "none", warning: "" };

    const upLcRes = useLoadBatch
      ? upLcFromTable01(formationKey, formationChain, calculated)
      : { value: 0, source: "" };

    const errorMult = pt.error_multiplier ?? errorMultiplierForFormation(formationKey);

    const calc = calculateCalibrationPoint(
      { ...pt, nominal_value: reference },
      {
        resolution: resolutionStr,
        unit,
        referenceValue: reference,
        up: upRes.valid ? upRes.value : 0,
        ud: udRes.valid ? udRes.value : 0,
        ue: ueRes.ue,
        upLC: upLcRes.value,
        errorMultiplier: errorMult,
      },
    );

    const decimalsFromResolution = decimalPlacesFromResolution(resolutionStr);
    const decimals = decimalsFromResolution ?? decimalPlacesForPoint(balance, pt.point_number || 1);

    const mergedPoint = {
      ...pt,
      nominal_value: reference ?? pt.nominal_value,
      display_decimals: decimals,
      ...calc.results,
    };
    const display = buildCertificatePointDisplay(mergedPoint, balance, unit);

    const p1Point = calculated.find((p) => p.point_number === 1);
    const upP1 = p1Point?.calculation_memory?.up ?? 0;
    const memUa = calc.results.calculation_memory?.ua ?? 0;
    const memUr = calc.results.calculation_memory?.ur ?? 0;
    const upLcSpreadsheet = useLoadBatch
      ? upLcFromSpreadsheetFormula({
        ua: memUa,
        ur: memUr,
        up: upRes.valid ? upRes.value : 0,
        upP1,
        nReadings: afterReadings.length || 3,
      })
      : null;

    const ppmEffective = resolveBuoyancyPpm(pt);

    const memory = {
      ...(calc.results.calculation_memory || {}),
      vcc_correction_applied: vccApplied,
      material_density: matDensity,
      buoyancy_method: ueRes.method,
      air_density: airDensity,
      referenceDisplay: display.reference,
      averageDisplay: display.average,
      indicationErrorDisplay: display.indicationError,
      expandedUncertaintyDisplay: display.expandedUncertainty,
      veffDisplay: display.veff,
      use_load_batch: useLoadBatch,
      load_batch_formation: formationKey || "",
      load_batch_nominal: pt.load_batch_nominal ?? null,
      weightReference,
      resolution: resolutionStr,
      ppmEffective,
      urel: ueRes.urel ?? null,
      upLcSource: upLcRes.source,
      upLcSpreadsheet,
      errorMultiplier: errorMult,
      weightContributions: buildWeightContributions(pt.standard_weight_ids, weightItems, unit),
      point_number: pt.point_number,
    };
    if (ueRes.warning) memory.buoyancy_warning = ueRes.warning;

    memory.calculationTrace = buildPointCalculationTrace(
      { ...mergedPoint, calculation_memory: memory },
      balance,
      unit,
    ).steps;

    const result = {
      ...mergedPoint,
      calc_status: calc.calcStatus,
      calc_error: calc.calcError,
      calculation_memory: memory,
    };

    calculated.push(result);

    if (calc.calcStatus === "calculado" && formationKey) {
      formationChain[formationKey] = {
        combinedUncertainty: memory.combinedUncertainty,
        point_number: pt.point_number,
      };
    }
    if (calc.calcStatus === "calculado" && pt.point_number === 1) {
      formationChain.p1 = { combinedUncertainty: memory.combinedUncertainty, point_number: 1 };
    }
  }

  return calculated;
}
