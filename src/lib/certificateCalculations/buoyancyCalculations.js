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
export const RHO_SOLID_REF = 8000;
const DEFAULT_MATERIAL_DENSITY = 7900;

function parseDensity(value, fallback) {
  const p = parseCalibrationNumber(value);
  return p.valid && p.value > 0 ? p.value : fallback;
}

/**
 * ρ_mat do peso (AJ49) — 8000 é densidade de referência da planilha (pc), não do material.
 * Usar 8000 zera o termo X em (1/ρ−1/8000)².
 */
export function resolveEmpMaterialDensity(materialDensity) {
  const parsed = parseCalibrationNumber(materialDensity);
  if (!parsed.valid || parsed.value <= 0) {
    return { density: DEFAULT_MATERIAL_DENSITY, correctedFromReference: false };
  }
  if (Math.abs(parsed.value - RHO_SOLID_REF) < 1e-9) {
    return {
      density: DEFAULT_MATERIAL_DENSITY,
      correctedFromReference: true,
      warning: "Densidade 8000 kg/m³ é referência da planilha (pc), não do peso — usando 7900 para EMP.P1",
    };
  }
  return { density: parsed.value, correctedFromReference: false };
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
  const matRes = resolveEmpMaterialDensity(materialDensity);
  const rhoMat = matRes.density;
  let warning = matRes.warning || "";

  const tInit = parseCalibrationNumber(environmental.initial_temperature);
  const tFin = parseCalibrationNumber(environmental.final_temperature);
  const rhInit = parseCalibrationNumber(environmental.initial_humidity);
  const rhFin = parseCalibrationNumber(environmental.final_humidity);

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

  let deltaT = 0;
  let deltaRh = 0;
  if (tbhReference.temperature != null && tbhReference.temperature !== "") {
    deltaT = tAvg - parseDensity(tbhReference.temperature, tAvg);
  } else if (tInit.valid && tFin.valid) {
    deltaT = tFin.value - tInit.value;
  }
  if (tbhReference.humidity != null && tbhReference.humidity !== "") {
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

  const x = uPaRel * termInvDiffSq;
  const y = termAirDelta * termW;
  const urel = Math.sqrt(x + y);
  const ue = vc * urel;

  if (x === 0 && termInvDiffSq === 0) {
    warning = warning || "Termo X do EMP.P1 = 0 — verifique densidade do material (deve ser ≠ 8000 kg/m³)";
  }

  return {
    ue,
    urel,
    valid: true,
    reason: "",
    method: "emp",
    warning,
    memory: {
      rhoAir,
      rhoMat,
      rhoMatInput: (() => {
        const p = parseCalibrationNumber(materialDensity);
        return p.valid && p.value > 0 ? p.value : null;
      })(),
      correctedFromReference: matRes.correctedFromReference,
      deltaT,
      deltaRh,
      uT,
      uRh,
      uPaRel,
      termInvDiffSq,
      termAirDelta,
      termW,
      empX: x,
      empY: y,
      urel,
    },
  };
}
