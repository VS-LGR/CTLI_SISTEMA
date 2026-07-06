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

const MONTH_LABELS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function monthIndexFromDate(isoDate, year) {
  if (!isoDate) return null;
  const s = String(isoDate).slice(0, 10);
  const y = Number(s.slice(0, 4));
  if (y !== year) return null;
  const m = Number(s.slice(5, 7));
  if (m < 1 || m > 12) return null;
  return m - 1;
}

function monthIndexFromTimestamp(ts, year) {
  if (!ts) return null;
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return null;
  if (d.getFullYear() !== year) return null;
  return d.getMonth();
}

/**
 * Agrega emissões por mês para o ano indicado.
 * @param {number} year
 * @param {Array<{ proposal_date?: string }>} proposals
 * @param {Array<{ issue_date?: string }>} certificates
 * @param {Array<{ calibration_date?: string, created_at?: string }>} coletas
 */
export function buildMonthlyEmissions(year, proposals = [], certificates = [], coletas = []) {
  const months = MONTH_LABELS.map((label, index) => ({
    month: index + 1,
    label,
    proposals: 0,
    certificates: 0,
    coletas: 0,
  }));

  proposals.forEach((row) => {
    const idx = monthIndexFromDate(row.proposal_date, year);
    if (idx != null) months[idx].proposals += 1;
  });

  certificates.forEach((row) => {
    const idx = monthIndexFromDate(row.issue_date, year);
    if (idx != null) months[idx].certificates += 1;
  });

  coletas.forEach((row) => {
    const idx = row.calibration_date
      ? monthIndexFromDate(row.calibration_date, year)
      : monthIndexFromTimestamp(row.created_at, year);
    if (idx != null) months[idx].coletas += 1;
  });

  const totals = months.reduce(
    (acc, m) => ({
      proposals: acc.proposals + m.proposals,
      certificates: acc.certificates + m.certificates,
      coletas: acc.coletas + m.coletas,
    }),
    { proposals: 0, certificates: 0, coletas: 0 },
  );

  return { year, months, totals };
}

export { MONTH_LABELS };
