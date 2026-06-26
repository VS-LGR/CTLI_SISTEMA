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

  if (point.use_load_batch && point.load_batch_material_preset) {
    return buoyancyPpmCombined(weightPpm, point.load_batch_material_preset, 1);
  }
  return weightPpm;
}

function parseBalanceAdjustmentPerformed(value) {
  const v = String(value ?? "").trim().toLowerCase();
  if (!v) return null;
  if (v === "sim" || v === "s" || v === "yes") return true;
  if (v === "nao" || v === "não" || v === "n" || v === "nao." || v === "não.") return false;
  return null;
}

function resolveUeForPoint(point, conventionalMassGrams, environmental, unit) {
  const matDensity = resolveMaterialDensity(point);
  const vcGrams = unit === "kg" ? conventionalMassGrams * 1000 : conventionalMassGrams;

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
      empMemory: emp.memory || {},
      ppmEffective: resolveBuoyancyPpm(point),
      warning: emp.warning || "",
    };
  }

  const ppm = resolveBuoyancyPpm(point);
  const ppmRes = calculateBuoyancyUncertaintyFromPpm(vcGrams, ppm);
  if (ppmRes.valid && ppmRes.ue != null) {
    return {
      ue: unit === "kg" ? ppmRes.ue / 1000 : ppmRes.ue,
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
    const useLoadBatch = Boolean(pt.use_load_batch);
    const formationKey = pt.load_batch_formation || formationKeyForPoint(pt.point_number, useLoadBatch);

    let vcWeightsSum = null;
    if (pt.standard_weight_ids?.length) {
      const vvc = sumConventionalFromWeightIds(pt.standard_weight_ids, weightItems, unit, { vccCorrection: false });
      if (vvc.valid) vcWeightsSum = vvc.value;
    }

    let vcUncorrected = vcWeightsSum;
    if (vcUncorrected == null) {
      const nom = parseCalibrationNumber(pt.nominal_value);
      if (nom.valid) vcUncorrected = nom.value;
    }

    if (useLoadBatch && pt.load_batch_nominal != null && !pt.standard_weight_ids?.length) {
      const lot = parseCalibrationNumber(pt.load_batch_nominal);
      const nom = parseCalibrationNumber(vcUncorrected ?? pt.nominal_value);
      if (lot.valid && nom.valid && nom.value >= lot.value) {
        vcUncorrected = nom.value - lot.value;
        vcWeightsSum = vcUncorrected;
      }
    }

    const weightReference = vcWeightsSum ?? vcUncorrected;

    if (useLoadBatch && pt.load_batch_nominal != null) {
      const baseForLot = vcWeightsSum ?? vcUncorrected ?? 0;
      const refWithLot = referenceWithLoadBatch(baseForLot, pt.load_batch_nominal, unit);
      if (refWithLot.valid) vcUncorrected = refWithLot.value;
    }

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

    const vcNum = parseCalibrationNumber(vcUncorrected);
    const ueRes = vcNum.valid
      ? resolveUeForPoint(pt, vcNum.value, environmental, unit)
      : { ue: 0, method: "none", warning: "" };

    const adjustmentPerformed = parseBalanceAdjustmentPerformed(environmental?.balance_adjusted);

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
