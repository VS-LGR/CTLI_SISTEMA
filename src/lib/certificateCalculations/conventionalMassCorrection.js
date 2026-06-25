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
