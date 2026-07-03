import { parseCalibrationNumber, decimalPlacesFromResolution } from "./parseNumber";
import {
  roundIndicationErrorFromRoundedInputs,
  roundExpandedUncertainty,
  resolveCertificateResolution,
} from "./certificateDisplayRounding";
import {
  buildLoadToleranceMap,
  findToleranceForNominal,
  resolveToleranceNominalForPoint,
} from "./pointMaxToleranceVerification";
import { resolveDefaultVerificationDivision } from "@/lib/calibrationCertificates/certificatePointUtils";

/** @typedef {'portaria_157'|'portaria_236'|'simples'|'erro_mais_incerteza'} LegalDecisionRule */

const PORTARIA_RULES = new Set(["portaria_157", "portaria_236", "simples", "erro_mais_incerteza"]);

/** Portaria INMETRO 157/2022 — Tabela 5, coluna Verificação (faixas m em divisões e). */
function portaria157VerificationBands(className) {
  const cls = String(className || "III").toUpperCase();
  if (cls === "I") {
    return [[0, 50_000, 1.0], [50_000, 200_000, 2.0], [200_000, Infinity, 2.0]];
  }
  if (cls === "II") {
    return [[0, 5_000, 1.0], [5_000, 20_000, 2.0], [20_000, 100_000, 2.0], [100_000, Infinity, 2.0]];
  }
  if (cls === "IIII") {
    return [[0, 50, 1.0], [50, 200, 2.0], [200, 1_000, 2.0], [1_000, Infinity, 2.0]];
  }
  return [[0, 500, 1.0], [500, 2_000, 2.0], [2_000, 10_000, 2.0], [10_000, Infinity, 2.0]];
}

function lookupToleranceDivisionsFromBands(bands, loadInVerificationDivisions) {
  const m = loadInVerificationDivisions;
  if (!Number.isFinite(m) || m < 0) return 0;
  for (const [lo, hi, n] of bands) {
    if (m > lo && m <= hi) return n;
    if (m === 0 && lo === 0) return n;
  }
  return bands[bands.length - 1][2];
}

/** Portaria INMETRO 157/2022 — Tabela 5, coluna Verificação. */
export function lookupPortaria157VerificationDivisions(className, loadInVerificationDivisions) {
  return lookupToleranceDivisionsFromBands(
    portaria157VerificationBands(className),
    loadInVerificationDivisions,
  );
}

/** @deprecated Portaria 236 — Aprovação de modelo; preferir lookupPortaria157VerificationDivisions. */
export function lookupPortaria236ToleranceDivisions(className, loadInVerificationDivisions) {
  const m = loadInVerificationDivisions;
  if (!Number.isFinite(m) || m < 0) return 0;

  const bands = className === "I"
    ? [[0, 500, 0.05], [500, 2000, 0.1], [2000, 10000, 0.15], [10000, Infinity, 0.2]]
    : className === "II"
      ? [[0, 500, 0.2], [500, 2000, 0.4], [2000, 10000, 0.6], [10000, Infinity, 0.8]]
      : [[0, 500, 0.5], [500, 2000, 1.0], [2000, 10000, 1.5], [10000, Infinity, 2.0]];

  for (const [lo, hi, n] of bands) {
    if (m > lo && m <= hi) return n;
    if (m === 0 && lo === 0) return n;
  }
  return bands[0][2];
}

/** Portaria INMETRO 157/2022 — tolerância positiva = n × e (Tabela 5, Verificação). */
export function calculatePortaria157Tolerance(className, nominal, verificationDivision, unit = "g") {
  const nom = parseCalibrationNumber(nominal);
  const e = parseCalibrationNumber(verificationDivision);
  if (!nom.valid || !e.valid || e.value <= 0) {
    return { positive: 0, negative: 0, valid: false };
  }

  let load = nom.value;
  let eVal = e.value;
  if (unit === "kg") {
    load *= 1000;
    eVal *= 1000;
  }
  const loadInE = eVal > 0 ? load / eVal : 0;
  const nDiv = lookupPortaria157VerificationDivisions(className, loadInE);
  const positive = nDiv * eVal;
  return { positive, negative: -positive, valid: true, nDivisions: nDiv };
}

function roundToDecimals(value, decimals) {
  if (!Number.isFinite(value)) return null;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function toGrams(value, unit = "g") {
  const parsed = parseCalibrationNumber(value);
  if (!parsed.valid) return null;
  return unit === "kg" ? parsed.value * 1000 : parsed.value;
}

function balanceUnit(balance = {}) {
  const u = String(balance.unidade || balance.unit || "g").trim().toLowerCase();
  return u === "kg" ? "kg" : "g";
}

function verificationDivisionNative(balance = {}) {
  const raw = balance.divisao_verificacao
    || balance.verification_division_1
    || balance.verification_division
    || "";
  const parsed = parseCalibrationNumber(raw);
  return parsed.valid ? parsed.value : 0;
}

function capacityNative(balance = {}) {
  const parsed = parseCalibrationNumber(balance.capacidade || balance.capacity_1 || "");
  return parsed.valid ? parsed.value : null;
}

/**
 * Metr. Legal — número de divisões H = capacidade / e (mesma unidade da capacidade).
 */
export function computeNumberOfDivisions(balance = {}) {
  const unit = balanceUnit(balance);
  const cap = capacityNative(balance);
  const eNative = verificationDivisionNative(balance);
  if (cap == null || eNative <= 0) return { value: null, valid: false };
  const eInCapUnit = unit === "kg" ? eNative / 1000 : eNative;
  if (eInCapUnit <= 0) return { value: null, valid: false };
  return { value: cap / eInCapUnit, valid: true };
}

/**
 * Metr. Legal — colunas Classe III / II / I e resultado parcial (aba Metr. Legal).
 */
export function determineInstrumentClassFromLegalMetrology(balance = {}) {
  const unit = balanceUnit(balance);
  const eNative = verificationDivisionNative(balance);
  const eGrams = unit === "kg" ? eNative * 1000 : eNative;
  const capGrams = toGrams(balance.capacidade || balance.capacity_1, unit);
  const numDiv = computeNumberOfDivisions(balance);

  const classIIIa = capGrams != null && eGrams > 0.0999999 && eGrams < 2.000001
    && numDiv.valid && numDiv.value > 99.999999 && numDiv.value < 10000.000001;
  const classIIIb = capGrams != null && eGrams > 4.9999999
    && numDiv.valid && numDiv.value > 499.9999999 && numDiv.value < 10000.000001;
  const classIII = classIIIa || classIIIb;

  const classIIa = eGrams > 0.0009999999 && eGrams < 0.05000001
    && numDiv.valid && numDiv.value > 99.9999999 && numDiv.value < 100000.000001;
  const classIIb = eGrams > 0.099999999
    && numDiv.valid && numDiv.value > 5000 && numDiv.value < 100000.000001;
  const classII = classIIa || classIIb;

  const classI = eGrams < 0.001000001
    || (numDiv.valid && numDiv.value > 49999.999999);

  let partial = "";
  if (numDiv.valid) {
    if (numDiv.value < 10000.000001) partial = "III";
    else if (numDiv.value > 10000 && numDiv.value < 100000.000001) partial = "II";
    else if (numDiv.value > 100000) partial = "I";
  }

  let instrumentClass = "";
  if (classIII) instrumentClass = "III";
  else if (classII) instrumentClass = "II";
  else if (classI) instrumentClass = "I";
  else if (partial) instrumentClass = partial;

  return {
    instrumentClass,
    partial,
    valid: Boolean(instrumentClass),
    numberOfDivisions: numDiv.valid ? numDiv.value : null,
    verificationDivisionGrams: eGrams,
  };
}

/** Compatibilidade — delega à lógica Metr. Legal quando há balança completa. */
export function determineInstrumentClass(capacity, resolution, unit = "g") {
  const fromBalance = determineInstrumentClassFromLegalMetrology({
    capacidade: capacity,
    resolucao: resolution,
    divisao_verificacao: resolution,
    unidade: unit,
  });
  if (fromBalance.valid) return { instrumentClass: fromBalance.instrumentClass, valid: true };

  const cap = parseCalibrationNumber(capacity);
  const res = parseCalibrationNumber(resolution);
  if (!cap.valid || !res.valid || res.value === 0) {
    return { instrumentClass: "", valid: false, reason: "Capacidade ou resolução inválida" };
  }

  let c = cap.value;
  let r = res.value;
  if (unit === "kg") {
    c *= 1000;
    r *= 1000;
  }
  const ratio = c / r;
  if (c > 0.001 && c < 0.05 && ratio > 100 && ratio < 100000) return { instrumentClass: "II", valid: true };
  if (c > 0.1 && ratio > 5000 && ratio < 100000) return { instrumentClass: "II", valid: true };
  if (c > 0.1 && c < 2 && ratio > 100 && ratio < 10000) return { instrumentClass: "III", valid: true };
  if (c > 5 && ratio > 500 && ratio < 10000) return { instrumentClass: "III", valid: true };
  if (c < 0.001 || ratio > 50000) return { instrumentClass: "I", valid: true };
  return { instrumentClass: "III", valid: true };
}

/** @deprecated — Aprovação de modelo (Portaria 236); preferir calculatePortaria157Tolerance. */
export function calculatePortaria236Tolerance(className, nominal, verificationDivision, unit = "g") {
  const nom = parseCalibrationNumber(nominal);
  const e = parseCalibrationNumber(verificationDivision);
  if (!nom.valid || !e.valid || e.value <= 0) {
    return { positive: 0, negative: 0, valid: false };
  }

  let load = nom.value;
  let eVal = e.value;
  if (unit === "kg") {
    load *= 1000;
    eVal *= 1000;
  }
  const loadInE = eVal > 0 ? load / eVal : 0;
  const nDiv = lookupPortaria236ToleranceDivisions(className, loadInE);
  const positive = nDiv * eVal;
  return { positive, negative: -positive, valid: true, nDivisions: nDiv };
}

/** @deprecated — mantido para testes legados; preferir calculatePortaria236Tolerance. */
export function calculateToleranceOiml(className, nominal, unit = "g") {
  const portaria = calculatePortaria236Tolerance(className, nominal, "1", unit);
  if (portaria.valid && portaria.positive > 0) return portaria;

  const n = parseCalibrationNumber(nominal);
  if (!n.valid) return { positive: null, negative: null, valid: false };
  let val = n.value;
  if (unit === "kg") val *= 1000;
  const e = className === "I" ? val * 0.001 : className === "II" ? val * 0.002 : val * 0.005;
  return { positive: e, negative: -e, valid: true };
}

function resolveLegalDecisionRule(conformity = {}, balance = {}) {
  const rule = conformity.decision_rule;
  if (rule === "portaria_236") return "portaria_157";
  if (PORTARIA_RULES.has(rule)) return rule;
  if (balance.portaria_inmetro) return "portaria_157";
  return "simples";
}

function resolveRoundingDecimals(balance = {}, point = {}, resolution) {
  const fromBalance = parseCalibrationNumber(balance.decimal_places?.p1 ?? balance.casas_decimais);
  if (fromBalance.valid) return Math.max(0, Math.round(fromBalance.value));
  const fromRes = decimalPlacesFromResolution(resolution);
  return fromRes != null ? fromRes : 4;
}

/**
 * Metr. Legal Pn-erro:
 * IF(média=0,0, ROUND(MROUND(média,d) − V.R., casas decimais))
 */
export function computeLegalIndicationError(point, balance = {}, unit = "g") {
  const resolution = resolveCertificateResolution(point, balance, unit);
  const decimals = resolveRoundingDecimals(balance, point, resolution);
  const avg = point.average_reading;
  const ref = point.nominal_value ?? point.calculation_memory?.referenceValue;

  const avgNum = parseCalibrationNumber(avg);
  if (avgNum.valid && avgNum.value === 0) return { value: 0, valid: true };

  const err = roundIndicationErrorFromRoundedInputs(avg, ref, resolution, decimals);
  if (err == null) return { value: null, valid: false };
  return { value: err, valid: true };
}

function resolveClientToleranceForPoint(point, tolerancesRaw, weightItems, unit) {
  const loadMap = buildLoadToleranceMap(
    (tolerancesRaw || []).filter((e) => e?.nominal_value && !e?._legacyPoint),
  );
  const nominalRes = resolveToleranceNominalForPoint(point, weightItems, unit);
  if (!nominalRes.valid) return 0;
  const match = findToleranceForNominal(nominalRes.value, unit, loadMap);
  if (!match) return 0;
  return match.parsedTolerance ?? 0;
}

/**
 * Metr. Legal — tolerância positiva conforme regra (col Tolerância Positiva).
 */
export function resolveLegalTolerancePositive({
  decisionRule,
  portariaTolerance = 0,
  clientTolerance = 0,
  clientTolerancePlusUe = 0,
}) {
  if (decisionRule === "portaria_157" || decisionRule === "portaria_236") return portariaTolerance;
  if (decisionRule === "erro_mais_incerteza") return clientTolerancePlusUe;
  return clientTolerance;
}

/**
 * Metr. Legal — Resultado Pn: CONFORME se erro ≤ tol+ e erro ≥ tol−.
 */
export function evaluatePointConformity(indicationError, _expandedUncertainty, tolerancePositive, toleranceNegative, _decisionRule = "simples") {
  const err = parseCalibrationNumber(indicationError);
  const tolP = parseCalibrationNumber(tolerancePositive);
  const tolN = parseCalibrationNumber(toleranceNegative);

  if (!err.valid || !tolP.valid || !tolN.valid) {
    return { result: "nao_avaliado", valid: false, reason: "Dados insuficientes" };
  }

  const testValue = err.value;
  if (testValue <= tolP.value && testValue >= tolN.value) {
    return { result: "conforme", valid: true, testValue };
  }
  return { result: "nao_conforme", valid: true, testValue };
}

function evaluateEccentricityLegalConformity(eccentricitySnapshot = {}, tolerancePositive = 0) {
  const ecc = eccentricitySnapshot || {};
  const rawPoints = ecc.pontos || [];
  const tolP = Number(tolerancePositive) || 0;
  const tolN = -tolP;

  const errors = rawPoints.slice(0, 5).map((pt, idx) => {
    const reading = pt?.depois ?? pt?.leitura_depois ?? pt?.antes ?? pt?.leitura_antes ?? "";
    const parsed = parseCalibrationNumber(reading);
    if (!parsed.valid) return { position: idx + 1, error: 0, result: "conforme" };
    const ev = evaluatePointConformity(parsed.value, null, tolP, tolN);
    return { position: idx + 1, error: parsed.value, result: ev.result };
  });

  while (errors.length < 5) {
    errors.push({ position: errors.length + 1, error: 0, result: "conforme" });
  }

  const evaluated = errors.filter((e) => e.result === "conforme" || e.result === "nao_conforme");
  const general = evaluated.length && evaluated.every((e) => e.result === "conforme")
    ? "conforme"
    : evaluated.some((e) => e.result === "nao_conforme")
      ? "nao_conforme"
      : "conforme";

  return { positions: errors, general };
}

export function calculateConformityForCertificate({
  balance,
  points,
  conformity,
  decisionRule,
  pointMaxTolerances = [],
  weightItems = [],
  eccentricitySnapshot = null,
}) {
  if (!conformity?.legal_metrology_applicable) {
    return {
      general: "nao_aplicavel",
      partialResult: "nao_aplicavel",
      pointResults: [],
      eccentricityResults: [],
    };
  }

  const unit = balanceUnit(balance);
  const clsInfo = determineInstrumentClassFromLegalMetrology(balance);
  const cls = conformity.instrument_class || clsInfo.instrumentClass;
  const rule = decisionRule || resolveLegalDecisionRule(conformity, balance);

  const pointResults = (points || []).map((pt) => {
    if (!pt.nominal_value || pt.calc_status !== "calculado") {
      return { pointNumber: pt.point_number, result: "nao_avaliado" };
    }

    const resolution = resolveCertificateResolution(pt, balance, unit);
    const verificationE = resolveDefaultVerificationDivision(pt.nominal_value, balance, unit);
    const legalError = computeLegalIndicationError(pt, balance, unit);

    const portariaTol = calculatePortaria157Tolerance(cls, pt.nominal_value, verificationE, unit);
    const clientTol = resolveClientToleranceForPoint(pt, pointMaxTolerances, weightItems, unit);

    const displayUe = roundExpandedUncertainty(
      pt.expanded_uncertainty,
      resolution,
      resolveRoundingDecimals(balance, pt, resolution),
    ) ?? 0;

    const clientTolPlusUe = clientTol > 0 || displayUe > 0
      ? roundToDecimals(clientTol + displayUe, resolveRoundingDecimals(balance, pt, resolution)) ?? (clientTol + displayUe)
      : 0;

    const tolPositive = resolveLegalTolerancePositive({
      decisionRule: rule,
      portariaTolerance: portariaTol.valid ? portariaTol.positive : 0,
      clientTolerance: clientTol,
      clientTolerancePlusUe: clientTolPlusUe,
    });
    const tolNegative = -tolPositive;

    const ev = evaluatePointConformity(
      legalError.valid ? legalError.value : pt.indication_error,
      pt.expanded_uncertainty,
      tolPositive,
      tolNegative,
      rule,
    );

    return {
      pointNumber: pt.point_number,
      result: ev.result,
      indicationError: legalError.valid ? legalError.value : null,
      tolerance: { positive: tolPositive, negative: tolNegative },
      decisionRule: rule,
      verificationDivision: verificationE,
    };
  });

  const activePoints = pointResults.filter((p) => p.result === "conforme" || p.result === "nao_conforme");
  const partialResult = activePoints.length
    ? (activePoints.every((p) => p.result === "conforme") ? "conforme" : "nao_conforme")
    : "nao_avaliado";

  const eccTolerance = parseCalibrationNumber(
    eccentricitySnapshot?.tolerancia ?? balance?.tolerancia_excentricidade ?? 0,
  ).valid
    ? parseCalibrationNumber(eccentricitySnapshot?.tolerancia ?? balance?.tolerancia_excentricidade ?? 0).value
    : 0;

  const eccentricityResults = evaluateEccentricityLegalConformity(eccentricitySnapshot, eccTolerance);

  let general = "nao_avaliado";
  if (activePoints.length) {
    const pointsOk = partialResult === "conforme";
    const eccOk = eccentricityResults.general === "conforme" || eccentricityResults.general === "nao_avaliado";
    general = pointsOk && eccOk ? "conforme" : "nao_conforme";
    if (eccentricityResults.general === "nao_conforme") general = "nao_conforme";
  }

  return {
    general,
    partialResult,
    instrumentClass: cls,
    pointResults,
    eccentricityResults: eccentricityResults.positions,
    classInfo: clsInfo,
  };
}
