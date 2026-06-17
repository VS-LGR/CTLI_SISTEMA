import { parseCalibrationNumber } from "./parseNumber";

/** Metrologia legal — regras simplificadas da aba Metr. Legal da planilha */
export function determineInstrumentClass(capacity, resolution, unit = "g") {
  const cap = parseCalibrationNumber(capacity);
  const res = parseCalibrationNumber(resolution);
  if (!cap.valid || !res.valid || res.value === 0) {
    return { instrumentClass: "", valid: false, reason: "Capacidade ou resolução inválida" };
  }

  let c = cap.value;
  let r = res.value;
  if (unit === "kg") {
    c = c * 1000;
    r = r * 1000;
  }

  const ratio = c / r;

  if (c > 0.001 && c < 0.05 && ratio > 100 && ratio < 100000) return { instrumentClass: "II", valid: true };
  if (c > 0.1 && ratio > 5000 && ratio < 100000) return { instrumentClass: "II", valid: true };
  if (c > 0.1 && c < 2 && ratio > 100 && ratio < 10000) return { instrumentClass: "III", valid: true };
  if (c > 5 && ratio > 500 && ratio < 10000) return { instrumentClass: "III", valid: true };
  if (c < 0.001 || ratio > 50000) return { instrumentClass: "I", valid: true };

  return { instrumentClass: "III", valid: true };
}

export function calculateToleranceOiml(className, nominal, unit = "g") {
  const n = parseCalibrationNumber(nominal);
  if (!n.valid) return { positive: null, negative: null, valid: false };

  let val = n.value;
  if (unit === "kg") val = val * 1000;

  const e = className === "I" ? val * 0.001 : className === "II" ? val * 0.002 : val * 0.005;
  return { positive: e, negative: -e, valid: true };
}

export function evaluatePointConformity(indicationError, expandedUncertainty, tolerancePositive, toleranceNegative, decisionRule = "simples") {
  const err = parseCalibrationNumber(indicationError);
  const u = parseCalibrationNumber(expandedUncertainty);
  const tolP = parseCalibrationNumber(tolerancePositive);
  const tolN = parseCalibrationNumber(toleranceNegative);

  if (!err.valid || !tolP.valid || !tolN.valid) {
    return { result: "nao_avaliado", valid: false, reason: "Dados insuficientes" };
  }

  const testValue = decisionRule === "erro_mais_incerteza" && u.valid
    ? err.value + u.value
    : err.value;

  if (testValue <= tolP.value && testValue >= tolN.value) {
    return { result: "conforme", valid: true, testValue };
  }
  return { result: "nao_conforme", valid: true, testValue };
}

export function calculateConformityForCertificate({ balance, points, conformity, decisionRule }) {
  if (!conformity?.legal_metrology_applicable) {
    return { general: "nao_aplicavel", pointResults: [] };
  }

  const cls = conformity.instrument_class
    || determineInstrumentClass(balance?.capacidade, balance?.resolucao, balance?.unidade).instrumentClass;

  const unit = balance?.unidade || "g";
  const pointResults = (points || []).map((pt) => {
    if (!pt.nominal_value || pt.calc_status !== "calculado") {
      return { pointNumber: pt.point_number, result: "nao_avaliado" };
    }
    const tol = calculateToleranceOiml(cls, pt.nominal_value, unit);
    const ev = evaluatePointConformity(
      pt.indication_error,
      pt.expanded_uncertainty,
      tol.positive,
      tol.negative,
      decisionRule || conformity.decision_rule,
    );
    return { pointNumber: pt.point_number, result: ev.result, tolerance: tol };
  });

  const active = pointResults.filter((p) => p.result !== "nao_avaliado");
  let general = "nao_avaliado";
  if (active.length) {
    general = active.every((p) => p.result === "conforme") ? "conforme" : "nao_conforme";
  }

  return { general, instrumentClass: cls, pointResults };
}
