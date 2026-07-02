/** Status considerados no KPI/gráfico de certificados da dashboard. */
export const DASHBOARD_CERTIFICATE_STATUSES = ["aprovado", "emitido", "enviado"];

export function countFromSupabaseHead({ count, error }) {
  if (error) throw error;
  return count ?? 0;
}

export function buildEquipmentExpiryAlerts(weightRows = [], envRows = [], today, warningDays = 60) {
  const alerts = [];

  weightRows.forEach((row) => {
    const status = classifyEquipmentExpiry(row.expiry_date, today, warningDays);
    if (!status) return;
    alerts.push({
      id: row.id,
      kind: "Peso padrão",
      label: row.set_name || row.certificate_number || "Certificado",
      expiry_date: row.expiry_date,
      status,
    });
  });

  envRows.forEach((row) => {
    const status = classifyEquipmentExpiry(row.expiry_date, today, warningDays);
    if (!status) return;
    alerts.push({
      id: row.id,
      kind: "Termo-baro",
      label: row.equipment_name || row.certificate_number || "Equipamento",
      expiry_date: row.expiry_date,
      status,
    });
  });

  alerts.sort((a, b) => String(a.expiry_date).localeCompare(String(b.expiry_date)));
  return alerts;
}

export function addDaysIso(isoDate, days) {
  const d = new Date(`${isoDate}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function classifyEquipmentExpiry(expiryDate, today, warningDays = 60) {
  if (!expiryDate) return null;
  const exp = String(expiryDate).slice(0, 10);
  if (exp < today) return "expired";
  const warnUntil = addDaysIso(today, warningDays);
  if (exp <= warnUntil) return "warning";
  return null;
}
