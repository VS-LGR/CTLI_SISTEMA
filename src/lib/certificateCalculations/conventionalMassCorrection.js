/** PR-7.2 §6.6 — correção VCC quando ρ_ar fora da faixa 1,08–1,32 kg/m³. */

export const AIR_DENSITY_TOLERANCE_MIN = 1.08;
export const AIR_DENSITY_TOLERANCE_MAX = 1.32;
export const REF_AIR_DENSITY = 1.2;
export const REF_SOLID_DENSITY = 8000;

export function shouldApplyVccCorrection(airDensity) {
  if (!Number.isFinite(airDensity)) return false;
  return airDensity < AIR_DENSITY_TOLERANCE_MIN || airDensity > AIR_DENSITY_TOLERANCE_MAX;
}

/**
 * VCC = VC × [ 1 + (Da − 1,2)/Du − (Da − 1,2)/Ds ]
 */
export function correctConventionalMassForBuoyancy(
  vc,
  airDensity,
  materialDensity,
  refAir = REF_AIR_DENSITY,
  refSolid = REF_SOLID_DENSITY,
) {
  if (!Number.isFinite(vc) || !Number.isFinite(airDensity) || !Number.isFinite(materialDensity) || materialDensity === 0) {
    return vc;
  }
  const delta = airDensity - refAir;
  const factor = 1 + delta / materialDensity - delta / refSolid;
  return vc * factor;
}

/** Fator multiplicativo VCC (Certificado-RBC AI49). */
export function vccBuoyancyFactor(airDensity, materialDensity, refAir = REF_AIR_DENSITY, refSolid = REF_SOLID_DENSITY) {
  if (!Number.isFinite(airDensity) || !Number.isFinite(materialDensity) || materialDensity === 0) {
    return 1;
  }
  const delta = airDensity - refAir;
  return 1 + delta / materialDensity - delta / refSolid;
}

/**
 * V.R. a partir do V.C agregado (AK49) — Certificado-RBC AI49.
 * @returns {{ reference: number|null, vccApplied: boolean, factor: number, vcUncorrected: number|null }}
 */
export function resolveReferenceFromConventionalMass({
  vcUncorrected,
  airDensity,
  materialDensity,
}) {
  const vc = vcUncorrected == null || vcUncorrected === "" ? NaN : Number(vcUncorrected);
  if (!Number.isFinite(vc)) {
    return { reference: null, vccApplied: false, factor: 1, vcUncorrected: null };
  }

  if (!shouldApplyVccCorrection(airDensity)) {
    return { reference: vc, vccApplied: false, factor: 1, vcUncorrected: vc };
  }

  const mat = Number(materialDensity);
  if (!Number.isFinite(mat) || mat <= 0) {
    return { reference: vc, vccApplied: false, factor: 1, vcUncorrected: vc };
  }

  const factor = vccBuoyancyFactor(airDensity, mat);
  return {
    reference: correctConventionalMassForBuoyancy(vc, airDensity, mat),
    vccApplied: true,
    factor,
    vcUncorrected: vc,
  };
}
