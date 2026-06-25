import { parseCalibrationNumber } from "./parseNumber";
import {
  calculateAirDensity,
  environmentalAverage,
} from "./environmentalCalculations";

const SQRT3 = Math.sqrt(3);
const SQRT12 = Math.sqrt(12);

/** Sensibilidades aba EMP.P1 */
const UP_PA = 1e-5 / 100;
const UT_PA = (-4e-3) / (-273.15);
const URH_PA = -9e-3;
const U_FORM = 2.4e-4;
const U_PRESSURE_HPA = 10;
const U_RHO_AIR = 70;
const RHO_AIR_REF = 1.2;
const RHO_SOLID_REF = 8000;

function parseDensity(value, fallback) {
  const p = parseCalibrationNumber(value);
  return p.valid && p.value > 0 ? p.value : fallback;
}

/**
 * PR-7.6 fallback — ue retangular a partir de PPM e V.C.
 * u = (V.C × ppm / 10⁶) / √3
 */
export function calculateBuoyancyUncertaintyFromPpm(conventionalMassGrams, ppm) {
  const vc = parseCalibrationNumber(conventionalMassGrams);
  const p = parseCalibrationNumber(ppm);
  if (!vc.valid || !p.valid || p.value <= 0) {
    return { ue: null, urel: null, valid: false, reason: "PPM ou V.C inválido", method: "ppm" };
  }
  const halfWidth = (vc.value * p.value) / 1e6;
  const ue = halfWidth / SQRT3;
  return {
    ue,
    urel: vc.value > 0 ? ue / vc.value : null,
    valid: true,
    reason: "",
    method: "ppm",
  };
}

/**
 * Empuxo ue = V.C × Urel — aba EMP.P1 da planilha RE-7.2B.
 */
export function calculateBuoyancyUncertainty({
  conventionalMass,
  materialDensity = 7900,
  environmental = {},
  tbhReference = {},
} = {}) {
  const vcParsed = parseCalibrationNumber(conventionalMass);
  if (!vcParsed.valid || vcParsed.value <= 0) {
    return { ue: null, urel: null, valid: false, reason: "Massa convencional inválida", method: "emp" };
  }
  const vc = vcParsed.value;
  const rhoMat = parseDensity(materialDensity, 7900);

  const tAvg = environmentalAverage(environmental.initial_temperature, environmental.final_temperature);
  const urAvg = environmentalAverage(environmental.initial_humidity, environmental.final_humidity);
  const pAvg = environmentalAverage(environmental.initial_pressure, environmental.final_pressure);

  if (tAvg == null || urAvg == null || pAvg == null) {
    return { ue: null, urel: null, valid: false, reason: "Condições ambientais incompletas", method: "emp", needsFallback: true };
  }

  const air = calculateAirDensity(tAvg, urAvg, pAvg);
  if (!air.valid) {
    return { ue: null, urel: null, valid: false, reason: air.reason, method: "emp", needsFallback: true };
  }

  const rhoAir = air.value;

  const tInit = parseCalibrationNumber(environmental.initial_temperature);
  const tFin = parseCalibrationNumber(environmental.final_temperature);
  const rhInit = parseCalibrationNumber(environmental.initial_humidity);
  const rhFin = parseCalibrationNumber(environmental.final_humidity);

  let deltaT = 0;
  let deltaRh = 0;
  if (tbhReference.temperature != null) {
    deltaT = tAvg - parseDensity(tbhReference.temperature, tAvg);
  } else if (tInit.valid && tFin.valid) {
    deltaT = tFin.value - tInit.value;
  }
  if (tbhReference.humidity != null) {
    deltaRh = urAvg - parseDensity(tbhReference.humidity, urAvg);
  } else if (rhInit.valid && rhFin.valid) {
    deltaRh = rhFin.value - rhInit.value;
  }

  const uT = Math.abs(deltaT) / SQRT12;
  const uRh = Math.abs(deltaRh) / SQRT12;

  const uPaRelSq =
    (UP_PA * U_PRESSURE_HPA) ** 2
    + (UT_PA * uT) ** 2
    + (URH_PA * uRh) ** 2
    + U_FORM ** 2;
  const uPaRel = Math.sqrt(uPaRelSq);

  const invDiffMat = 1 / rhoMat - 1 / RHO_SOLID_REF;
  const termInvDiffSq = invDiffMat ** 2;
  const termAirDelta = (rhoAir - RHO_AIR_REF) ** 2;
  const termW = (U_RHO_AIR ** 2) / (RHO_SOLID_REF ** 4);

  // EMP.P1: X = u(pa)/pa × (1/ρ_mat−1/8000)²; Y = (ρ_ar−1,2)² × 70²/8000⁴
  const x = uPaRel * termInvDiffSq;
  const y = termAirDelta * termW;
  const urel = Math.sqrt(x + y);
  const ue = vc * urel;

  return {
    ue,
    urel,
    valid: true,
    reason: "",
    method: "emp",
    memory: {
      rhoAir,
      rhoMat,
      deltaT,
      deltaRh,
      uPaRel,
      urel,
    },
  };
}
