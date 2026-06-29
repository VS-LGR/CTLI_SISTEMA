import { balanceSnapshotFromScaleRegistration } from "@/lib/scaleRegistrations/scaleRegistrationUtils";

/** Resolve balança cadastrada por série (+ cliente opcional). */
export function resolveScaleRegistration(scaleSerial, endCustomerId, scaleRegistrations = []) {
  const serial = (scaleSerial || "").trim().toLowerCase();
  if (!serial) return null;

  const matches = scaleRegistrations.filter(
    (s) => (s.serial_number || "").trim().toLowerCase() === serial && s.active !== false,
  );
  if (!matches.length) return null;

  if (endCustomerId) {
    const byCustomer = matches.find((s) => s.end_customer_id === endCustomerId);
    if (byCustomer) return byCustomer;
  }

  return matches[0];
}

/** Mescla snapshot da coleta com cadastro de balança (cadastro prevalece quando preenchido). */
export function mergeBalanceSnapshotFromScale(coletaBalance, scaleRegistration) {
  if (!scaleRegistration) return { ...(coletaBalance || {}) };
  const fromScale = balanceSnapshotFromScaleRegistration(scaleRegistration);
  const base = { ...(coletaBalance || {}) };
  for (const [key, val] of Object.entries(fromScale)) {
    if (key === "point_max_tolerances") {
      if (Array.isArray(val) && val.length) base.point_max_tolerances = val;
      continue;
    }
    if (val != null && String(val).trim() !== "") base[key] = val;
  }
  if (!base.serie && scaleRegistration.serial_number) base.serie = scaleRegistration.serial_number;
  return base;
}

/** Resolve executor por FK ou nome. */
export function resolveExecutor(payload, employees = []) {
  const executorId = payload?.controle?.executor_id;
  if (executorId) {
    const match = employees.find((e) => e.id === executorId);
    if (match) return { executor_id: match.id, executor_name: match.full_name || "" };
  }
  const name = (payload?.controle?.nome_executor || "").trim().toLowerCase();
  if (!name) return { executor_id: null, executor_name: "" };
  const match = employees.find((e) => (e.full_name || "").trim().toLowerCase() === name);
  return {
    executor_id: match?.id || null,
    executor_name: match?.full_name || payload?.controle?.nome_executor || "",
  };
}

/** Valida pesos padrão e certificados na data da calibração. */
export function validateWeightIdsForCalibration(weightIds, weightItems, weightCerts, calibrationDate, warnings = []) {
  const calDate = calibrationDate || null;
  for (const wid of weightIds || []) {
    const item = weightItems.find((w) => w.id === wid);
    if (!item) {
      warnings.push(`Peso padrão ${wid} não encontrado no cadastro — ignorado`);
      continue;
    }
    const certId = item.weight_certificate_id;
    const cert = certId
      ? weightCerts.find((c) => c.id === certId)
      : weightCerts.find((c) => c.certificate_number === item.certificate_number);
    if (cert?.expiry_date && calDate && cert.expiry_date < calDate) {
      warnings.push(`Certificado ${cert.certificate_number || item.identification} vencido na data da calibração`);
    }
  }
  return warnings;
}
