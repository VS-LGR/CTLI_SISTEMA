/**
 * Cálculo de item RE-5.4.2B (aba P1 da planilha) — comparação direta de pesos.
 */

import { parseCalibrationNumber } from "@/lib/certificateCalculations/parseNumber";
import { coverageFactorFromNu } from "@/lib/certificateCalculations/pointCalculations";
import {
  AIR_DENSITY_REF,
  REFERENCE_DENSITY_DS,
  lookupClassUncertainty,
  materialDensityEntry,
  toGrams,
} from "./oimlTables";

const SQRT3 = Math.sqrt(3);

function num(raw, fallback = null) {
  const p = parseCalibrationNumber(raw);
  return p.valid ? p.value : fallback;
}

function stdevSample(values) {
  const n = values.length;
  if (n < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const sumSq = values.reduce((s, v) => s + (v - mean) ** 2, 0);
  return Math.sqrt(sumSq / (n - 1));
}

function average(values) {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * Factor k ≡ Excel TINV(0.0455, ν), capped at 550 as in the sheet.
 * For ν < 100 uses the shared PR-7.2 table; for large ν uses Cornish–Fisher with z=2.
 */
function coverageFactorForWeight(nu) {
  if (!Number.isFinite(nu) || nu <= 0) return 2;
  const n = Math.min(nu, 550);
  if (n < 100) return coverageFactorFromNu(n);
  const z = 2; // P(|Z|<2) = 95,45%
  const z3 = z ** 3;
  const z5 = z ** 5;
  const z7 = z ** 7;
  const z9 = z ** 9;
  const g1 = (z3 + z) / (4 * n);
  const g2 = (5 * z5 + 16 * z3 + 3 * z) / (96 * n * n);
  const g3 = (3 * z7 + 19 * z5 + 17 * z3 - 15 * z) / (384 * n * n * n);
  const g4 = (79 * z9 + 776 * z7 + 1482 * z5 - 1920 * z3 - 945 * z) / (92160 * n ** 4);
  return z + g1 + g2 + g3 + g4;
}

/** Densidade do ar (kg/m³) — fórmula da planilha L18. T °C, UR %, P hPa. */
export function airDensity(T, UR, P) {
  if (![T, UR, P].every(Number.isFinite)) return null;
  return ((0.348444 * P) - (UR * ((0.00252 * T) - 0.020582))) / (273.15 + T);
}

/**
 * Fator de correção para massa convencional a 1,2 kg/m³.
 * buoyancyCorrFactor = 1 + (Da - 1.2) * (1/Du - 1/Ds)
 */
export function buoyancyCorrFactor(Da, Du, Ds = REFERENCE_DENSITY_DS) {
  if (![Da, Du, Ds].every(Number.isFinite) || Du === 0 || Ds === 0) return null;
  return 1 + (Da - AIR_DENSITY_REF) * (1 / Du - 1 / Ds);
}

/** Excel ROUNDUP(value, digits). */
export function roundUp(value, digits) {
  if (!Number.isFinite(value)) return null;
  const d = Math.max(0, Math.floor(digits));
  const f = 10 ** d;
  return Math.ceil(value * f - 1e-12) / f;
}

function fixedRound(value, digits) {
  if (!Number.isFinite(value)) return null;
  const d = Math.max(0, Math.floor(digits));
  const f = 10 ** d;
  return Math.round(value * f) / f;
}

/**
 * Monta sequência padrão/mensurando da planilha.
 * input.cycles: array de { standard_reading, measuring_reading }
 * input.closing_standard_reading: leitura do padrão após o último mensurando (opcional).
 */
function buildAlternatingSeries(input, n) {
  const cycles = Array.isArray(input.cycles) ? input.cycles : [];
  const standards = [];
  const measuring = [];
  const deviations = [];

  for (let i = 0; i < n; i += 1) {
    const c = cycles[i] || {};
    const s = num(c.standard_reading);
    const m = num(c.measuring_reading);
    if (s == null || m == null) {
      return { ok: false, reason: `Ciclo ${i + 1}: informe leitura do padrão e do mensurando` };
    }
    standards.push(s);
    measuring.push(m);
  }

  let closing = num(input.closing_standard_reading);
  if (closing == null && cycles[n]) {
    closing = num(cycles[n].standard_reading);
  }
  if (closing == null) {
    // Planilha exige n+1 padrões; na prática, se só há n ciclos no formulário,
    // usa o padrão do último ciclo como fechamento quando as leituras são estáveis.
    closing = standards[standards.length - 1];
  }
  if (closing == null) {
    return { ok: false, reason: "Leitura de fechamento do padrão ausente" };
  }
  standards.push(closing);

  for (let i = 0; i < n; i += 1) {
    const avgAdj = (standards[i] + standards[i + 1]) / 2;
    deviations.push(measuring[i] - avgAdj);
  }

  return {
    ok: true,
    n,
    standards,
    measuring,
    deviations,
    meanDeviation: average(deviations),
    stdevStandards: stdevSample(standards),
    stdevMeasuring: stdevSample(measuring),
  };
}

function emptyError(message) {
  return {
    airDensity: null,
    buoyancyFactor: null,
    correctedValue: null,
    conventionalValue: null,
    deviation: null,
    combinedUncertainty: null,
    coverageFactor: null,
    degreesOfFreedom: null,
    expandedUncertainty: null,
    roundedUncertainty: null,
    classUncertainty: null,
    usedUncertainty: null,
    displayNominal: null,
    displayConventional: null,
    displayDeviation: null,
    displayUncertainty: null,
    displayCoverageFactor: null,
    tolerancePositive: null,
    toleranceNegative: null,
    approved: null,
    conformity_result: "nao_avaliado",
    specificDensity: null,
    calculation_memory: {},
    calc_status: "erro",
    calc_error: message,
  };
}

/**
 * @param {object} input
 * @returns {object} resultado alinhado à planilha P1
 */
export function calculateWeightItem(input = {}) {
  try {
    const unit = String(input.nominal_unit || "g").toLowerCase();
    const decimals = Number.isFinite(Number(input.decimal_places))
      ? Math.max(0, Math.floor(Number(input.decimal_places)))
      : 4;
    const cycleCount = Number.isFinite(Number(input.cycle_count))
      ? Math.max(1, Math.min(10, Math.floor(Number(input.cycle_count))))
      : 3;

    const nominal = num(input.nominal_value);
    const refVvc = num(input.reference_conventional_value);
    const refUnc = num(input.reference_uncertainty);
    const resolution = num(input.balance_resolution);
    const T = num(input.ambient_temp);
    const UR = num(input.ambient_humidity);
    const P = num(input.ambient_pressure);

    if (nominal == null) return emptyError("Valor nominal ausente");
    if (refVvc == null) return emptyError("Valor convencional do padrão ausente");
    if (refUnc == null) return emptyError("Incerteza do padrão ausente");
    if (resolution == null) return emptyError("Resolução da balança ausente");
    if (T == null || UR == null || P == null) return emptyError("Condições ambientais incompletas");

    const uutMat = materialDensityEntry(input.uut_material);
    const refMat = materialDensityEntry(input.reference_material);
    if (!uutMat) return emptyError("Material do mensurando inválido");
    if (!refMat) return emptyError("Material do padrão inválido");

    const series = buildAlternatingSeries(input, cycleCount);
    if (!series.ok) return emptyError(series.reason);

    const Da = airDensity(T, UR, P);
    const Du = uutMat.density;
    const Ds = REFERENCE_DENSITY_DS;
    const factor = buoyancyCorrFactor(Da, Du, Ds);
    if (Da == null || factor == null) return emptyError("Falha no cálculo de empuxo");

    const n = series.n;
    const nRefDiv = n; // B10
    const nMeasDiv = Math.max(1, n - 1); // C10 = B10-1

    const measuringEstimate = nominal + series.meanDeviation; // C6 + H (desvio médio)
    const refCorrection = refVvc - nominal; // B47 = B7 - B6 (mesmo nominal do mensurando/padrão)
    const conventionalValue = measuringEstimate + refCorrection; // B53
    const correctedValue = conventionalValue * factor;
    const deviation = conventionalValue - nominal;

    // Orçamento de incerteza (unidade do nominal — tipicamente g)
    const uaPadrao = series.stdevStandards / Math.sqrt(nRefDiv);
    const uaMensurando = series.stdevMeasuring / Math.sqrt(nMeasDiv);
    const up = refUnc / 2;
    const ud = refUnc / SQRT3;
    const ur = (resolution / 2) / SQRT3;
    const ppmUut = (uutMat.ppm * (nominal / 1e6));
    const ppmRef = (refMat.ppm * (refVvc / 1e6));
    const ueMensurando = ppmUut / SQRT3;
    const uePadrao = ppmRef / SQRT3;

    const components = [
      { key: "ua_padrao", u: uaPadrao, nu: nRefDiv - 1 },
      { key: "ua_mensurando", u: uaMensurando, nu: nMeasDiv - 1 },
      { key: "up", u: up, nu: Infinity },
      { key: "ud", u: ud, nu: Infinity },
      { key: "ur", u: ur, nu: Infinity },
      { key: "ue_mensurando", u: ueMensurando, nu: Infinity },
      { key: "ue_padrao", u: uePadrao, nu: Infinity },
    ];

    const uc = Math.sqrt(components.reduce((s, c) => s + c.u * c.u, 0));

    let veff;
    if (uaPadrao + uaMensurando === 0) {
      veff = 550;
    } else {
      const denom =
        (uaPadrao > 0 ? (uaPadrao ** 4) / Math.max(nRefDiv - 1, 1) : 0)
        + (uaMensurando > 0 ? (uaMensurando ** 4) / Math.max(nMeasDiv - 1, 1) : 0);
      veff = denom > 0 ? (uc ** 4) / denom : 550;
    }
    if (!Number.isFinite(veff) || veff <= 0) veff = 550;
    const veffForK = veff > 550 ? 550 : veff;
    const k = coverageFactorForWeight(veffForK);
    const U95 = uc * k;

    const displayExpanded = fixedRound(U95, decimals + 1);
    const roundedUncertainty = roundUp(displayExpanded ?? U95, decimals);

    const nominalG = toGrams(nominal, unit);
    const classUncRaw = lookupClassUncertainty(nominalG, input.uut_class, unit === "mg" ? "mg" : "g");
    const classUncertainty = classUncRaw != null ? fixedRound(classUncRaw, decimals) : null;

    const assumeClass = input.assume_class_uncertainty !== false;
    const usedUncertainty = assumeClass && classUncertainty != null
      ? classUncertainty
      : roundedUncertainty;

    let tolerancePositive = null;
    let toleranceNegative = null;
    let approved = null;
    let conformity_result = "nao_avaliado";

    // FIXED / ROUNDUP da planilha (D57–D63 / CERTIFICADO F61)
    const displayNominal = fixedRound(nominal, decimals);
    const displayConventional = fixedRound(conventionalValue, decimals);
    const displayDeviation = fixedRound(
      (displayConventional ?? 0) - (displayNominal ?? 0),
      decimals,
    );
    const displayUncertainty = usedUncertainty;
    const displayCoverageFactor = fixedRound(k, 2);

    if (classUncertainty != null && usedUncertainty != null) {
      const erroPermitido = classUncertainty * 3;
      // G59 = Mo - (U - erro) = upper; G60 = Mo + (U - erro) = lower
      tolerancePositive = fixedRound(nominal - (usedUncertainty - erroPermitido), decimals);
      toleranceNegative = fixedRound(nominal + (usedUncertainty - erroPermitido), decimals);
      const found = conventionalValue;
      const aboveLower = toleranceNegative < found;
      const belowUpper = tolerancePositive > found;
      approved = aboveLower && belowUpper;
      conformity_result = approved ? "conforme" : "nao_conforme";
    }

    return {
      airDensity: Da,
      buoyancyFactor: factor,
      correctedValue,
      conventionalValue,
      deviation,
      combinedUncertainty: uc,
      coverageFactor: k,
      degreesOfFreedom: veff,
      /** U95 bruto (memória); certificado usa usedUncertainty / displayUncertainty */
      expandedUncertainty: U95,
      roundedUncertainty,
      classUncertainty,
      usedUncertainty,
      displayNominal,
      displayConventional,
      displayDeviation,
      displayUncertainty,
      displayCoverageFactor,
      tolerancePositive,
      toleranceNegative,
      approved,
      conformity_result,
      specificDensity: Du,
      calculation_memory: {
        unit,
        decimals,
        cycle_count: n,
        mean_deviation: series.meanDeviation,
        measuring_estimate: measuringEstimate,
        reference_correction: refCorrection,
        standards: series.standards,
        measuring: series.measuring,
        deviations: series.deviations,
        stdev_standards: series.stdevStandards,
        stdev_measuring: series.stdevMeasuring,
        components: Object.fromEntries(components.map((c) => [c.key, c.u])),
        ue_ppm_uut: ppmUut,
        ue_ppm_ref: ppmRef,
        display_expanded: displayExpanded,
        U95,
        coverage_factor_raw: k,
        assume_class_uncertainty: assumeClass,
        erro_permitido: classUncertainty != null ? classUncertainty * 3 : null,
      },
      calc_status: "calculado",
      calc_error: "",
    };
  } catch (err) {
    return emptyError(err?.message || "Erro no cálculo");
  }
}
