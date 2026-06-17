import { CRITICAL_ANALYSIS_CHECKLIST } from "./certificateSchema";

export function validateBeforeCalculate(cert, points, standards, environmental) {
  const errors = [];
  if (!cert?.collection_id && !cert?.balance_snapshot?.serie) errors.push("Coleta ou balança não vinculada");
  if (!cert?.client_name) errors.push("Cliente não preenchido");
  if (!cert?.scale_serial) errors.push("Número de série da balança obrigatório");
  if (!cert?.calibration_date) errors.push("Data da calibração obrigatória");
  if (!cert?.executor_id && !cert?.executor_name) errors.push("Executor não definido");

  const activePoints = (points || []).filter(
    (p) => p.nominal_value || p.reading1 || p.reading2 || p.reading3,
  );
  if (!activePoints.length) errors.push("Pelo menos um ponto de calibração é obrigatório");
  if (!(standards || []).length) errors.push("Padrões utilizados não registrados");

  const env = environmental || {};
  if (!env.initial_temperature && !env.final_temperature) {
    errors.push("Condições ambientais incompletas");
  }

  return { ok: !errors.length, errors };
}

export function validateBeforeApproval(cert, points, standards, environmental, checklist = {}) {
  const base = validateBeforeCalculate(cert, points, standards, environmental);
  const errors = [...base.errors];

  const calcErrors = (points || []).filter((p) => {
    const hasData = p.nominal_value || p.reading1;
    return hasData && p.calc_status !== "calculado";
  });
  if (calcErrors.length) errors.push("Existem pontos com cálculo pendente ou com erro");

  const expired = (standards || []).filter((s) => {
    if (!s.valid_until || !cert.calibration_date) return false;
    if (s.expired_override) return false;
    return s.valid_until < cert.calibration_date;
  });
  if (expired.length) errors.push("Há padrão vencido na data da calibração");

  if (!cert?.signatory_id) errors.push("Signatário não definido");

  for (const item of CRITICAL_ANALYSIS_CHECKLIST) {
    if (!checklist[item.key]) errors.push(`Análise crítica: ${item.label}`);
  }

  return { ok: !errors.length, errors };
}

export function validateBeforeEmit(cert, points, standards) {
  const errors = [];
  if (!cert?.signatory_id) errors.push("Signatário deve aprovar antes da emissão");
  if (!cert?.certificate_number) errors.push("Número do certificado obrigatório");
  if (cert?.status !== "aprovado") errors.push("Certificado deve estar aprovado");
  if (cert?.is_preview_only) errors.push("Prévia técnica não pode ser emitida oficialmente");

  const base = validateBeforeApproval(cert, points, standards, {}, { calculations_ok: true, preview_reviewed: true });
  errors.push(...base.errors.filter((e) => !e.startsWith("Análise crítica")));

  return { ok: !errors.length, errors: [...new Set(errors)] };
}

export function validateExpiredStandards(standards, calibrationDate) {
  return (standards || [])
    .filter((s) => s.valid_until && calibrationDate && s.valid_until < calibrationDate && !s.expired_override)
    .map((s) => s.identification_code || s.description || "Padrão");
}
