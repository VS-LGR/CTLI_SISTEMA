export { parseCalibrationNumber, parseImportNumeric, toDbNumeric, formatCalcDisplay, fmtEmpMicro, fmtEmpScientific, decimalPlacesFromResolution, normalizeDecimalString } from "./parseNumber";
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
  describeWeightComposition,
  maxStandardUncertaintyPpm,
  standardUncertaintyAbsFromWeightIds,
  standardUncertaintyUpFromWeightIds,
  standardUncertaintyUpWithLoadBatch,
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
  resolveReferenceFromConventionalMass,
  vccBuoyancyFactor,
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
  describeWeightComposition,
  calculateCalibrationPoint,
  standardUncertaintyUpWithLoadBatch,
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
import { resolveReferenceFromConventionalMass } from "./conventionalMassCorrection";

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

  if (point.use_load_batch) {
    const lotPreset = point.load_batch_material_preset || point.material_preset;
    if (lotPreset) {
      return buoyancyPpmCombined(weightPpm, lotPreset, 1);
    }
  }
  return weightPpm;
}

function parseBalanceAdjustmentPerformed(value) {
  const v = String(value ?? "").trim().toLowerCase();
  if (!v) return null;
  if (v === "sim" || v === "s" || v === "yes" || v === "true" || v === "1") return true;
  if (v === "nao" || v === "não" || v === "n" || v === "nao." || v === "não." || v === "false" || v === "0") return false;
  return null;
}

function nearlyEqual(a, b, epsilon = 1e-12) {
  const nA = Number(a);
  const nB = Number(b);
  return Number.isFinite(nA) && Number.isFinite(nB) && Math.abs(nA - nB) <= epsilon;
}

function toGramsFromUnit(value, unit = "g") {
  if (!Number.isFinite(value)) return null;
  if (unit === "kg") return value * 1000;
  if (unit === "mg") return value / 1000;
  return value;
}

function fromGramsToUnit(value, unit = "g") {
  if (!Number.isFinite(value)) return null;
  if (unit === "kg") return value / 1000;
  if (unit === "mg") return value * 1000;
  return value;
}

function resolveUeForPoint(point, conventionalMass, environmental, unit) {
  const matDensity = resolveMaterialDensity(point);
  const vcGrams = toGramsFromUnit(conventionalMass, unit);

  const emp = calculateBuoyancyUncertainty({
    conventionalMass: vcGrams,
    materialDensity: matDensity,
    environmental: environmental || {},
    tbhReference: environmental?.tbh_reference || {},
  });

  if (emp.valid && emp.ue != null) {
    return {
      ue: fromGramsToUnit(emp.ue, unit),
      method: emp.method,
      urel: emp.urel,
      empMemory: emp.memory || {},
      ppmEffective: resolveBuoyancyPpm(point),
      warning: emp.warning || "",
    };
  }

  const ppm = resolveBuoyancyPpm(point);
  const ppmRes = calculateBuoyancyUncertaintyFromPpm(vcGrams, ppm);
  if (ppmRes.valid && ppmRes.ue != null) {
    return {
      ue: fromGramsToUnit(ppmRes.ue, unit),
      method: "ppm",
      urel: ppmRes.urel,
      empMemory: null,
      ppmEffective: ppm,
      warning: emp.reason || "Empuxo calculado via PPM (ambientais incompletos)",
    };
  }

  return { ue: 0, method: "none", urel: null, empMemory: null, warning: ppmRes.reason || "Empuxo não calculado" };
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
    const ueG = ue.valid ? toGramsFromUnit(ue.value, item.unit || unit) : null;
    const driftG = drift.valid ? toGramsFromUnit(Math.abs(drift.value), item.unit || unit) : null;
    const uFromUe = ueG != null ? fromGramsToUnit(ueG / kVal, unit) : null;
    const uFromDrift = driftG != null ? fromGramsToUnit(driftG / SQRT3, unit) : null;
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
    const useLoadBatch = Boolean(pt.use_load_batch);
    const formationKey = pt.load_batch_formation || formationKeyForPoint(pt.point_number, useLoadBatch);
    const errorMult = pt.error_multiplier ?? errorMultiplierForFormation(formationKey);

    let vcWeightsSum = null;
    if (pt.standard_weight_ids?.length) {
      const vvc = sumConventionalFromWeightIds(pt.standard_weight_ids, weightItems, unit, { vccCorrection: false });
      if (vvc.valid) vcWeightsSum = vvc.value;
    }

    let vcBase = vcWeightsSum;
    const nominalPoint = parseCalibrationNumber(pt.nominal_value);
    const lotConventional = parseCalibrationNumber(pt.load_batch_conventional_value);
    const lotNominal = parseCalibrationNumber(pt.load_batch_nominal);
    const previousMemory = pt.calculation_memory || {};

    if (vcBase == null) {
      if (
        !useLoadBatch
        && nominalPoint.valid
        && previousMemory.vcc_correction_applied
        && previousMemory.vc_uncorrected != null
        && nearlyEqual(nominalPoint.value, previousMemory.referenceValue)
      ) {
        vcBase = Number(previousMemory.vc_uncorrected);
      } else if (useLoadBatch && nominalPoint.valid && Number(errorMult) > 1) {
        vcBase = nominalPoint.value / Number(errorMult);
      } else if (useLoadBatch && nominalPoint.valid && lotConventional.valid) {
        vcBase = nominalPoint.value - lotConventional.value;
      } else if (useLoadBatch && nominalPoint.valid && lotNominal.valid) {
        vcBase = nominalPoint.value - lotNominal.value;
      } else if (nominalPoint.valid) {
        vcBase = nominalPoint.value;
      }
    }

    let vcUncorrected = vcBase;
    let loadBatchQuantity = null;
    let loadBatchReferenceMethod = "none";
    if (useLoadBatch && vcBase != null) {
      const lotValue = lotConventional.valid ? lotConventional.value : (lotNominal.valid ? lotNominal.value : null);
      const refWithLot = referenceWithLoadBatch(vcBase, lotValue, unit, errorMult);
      if (refWithLot.valid) {
        vcUncorrected = refWithLot.value;
        loadBatchQuantity = vcUncorrected - vcBase;
        loadBatchReferenceMethod = refWithLot.method;
      }
    }

    const weightReference = vcBase;

    const vccRes = resolveReferenceFromConventionalMass({
      vcUncorrected,
      airDensity,
      materialDensity: matDensity,
    });
    const reference = vccRes.reference;
    const vccApplied = vccRes.vccApplied;

    const resolutionStr = resolveCertificateResolution(
      { ...pt, nominal_value: reference ?? pt.nominal_value },
      balance,
      unit,
      { preferMemory: false },
    );

    const upRes = standardUncertaintyUpWithLoadBatch(pt.standard_weight_ids, weightItems, pt, unit);
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

    const vcNum = parseCalibrationNumber(vcUncorrected);
    const ueRes = vcNum.valid
      ? resolveUeForPoint(pt, vcNum.value, environmental, unit)
      : { ue: 0, method: "none", warning: "" };

    const adjustmentPerformed = parseBalanceAdjustmentPerformed(environmental?.balance_adjusted);

    const upLcRes = useLoadBatch
      ? upLcFromTable01(formationKey, formationChain, calculated)
      : { value: 0, source: "" };

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
        errorMultiplier: 1,
        adjustmentPerformed,
      },
    );

    const decimalsFromResolution = decimalPlacesFromResolution(resolutionStr);
    const decimals = decimalsFromResolution ?? decimalPlacesForPoint(balance, pt.point_number || 1);

    const mergedPoint = {
      ...pt,
      nominal_value: reference ?? pt.nominal_value,
      display_decimals: decimals,
      ...calc.results,
      resolution: resolutionStr,
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
      vcc_factor: vccApplied ? vccRes.factor : 1,
      vc_uncorrected: vcUncorrected,
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
      load_batch_conventional_value: pt.load_batch_conventional_value ?? null,
      load_batch_expanded_uncertainty: pt.load_batch_expanded_uncertainty ?? null,
      loadBatchQuantity,
      loadBatchReferenceMethod,
      vc_base: vcBase,
      weightReference,
      resolution: resolutionStr,
      ppmEffective,
      urel: ueRes.urel ?? null,
      empDeltaT: ueRes.empMemory?.deltaT ?? null,
      empDeltaRh: ueRes.empMemory?.deltaRh ?? null,
      empUT: ueRes.empMemory?.uT ?? null,
      empURh: ueRes.empMemory?.uRh ?? null,
      empUPaRel: ueRes.empMemory?.uPaRel ?? null,
      empX: ueRes.empMemory?.empX ?? null,
      empY: ueRes.empMemory?.empY ?? null,
      empUrel: ueRes.empMemory?.urel ?? ueRes.urel ?? null,
      empMaterialDensityUsed: ueRes.empMemory?.rhoMat ?? null,
      empConventionalMass: vcUncorrected ?? null,
      balance_adjusted: environmental?.balance_adjusted ?? null,
      adjustment_performed: adjustmentPerformed,
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
