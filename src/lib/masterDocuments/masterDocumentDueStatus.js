export const DUE_WARNING_DAYS = 30;

export function daysUntil(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.ceil((d - today) / (1000 * 60 * 60 * 24));
}

/** @returns {'missing' | 'overdue' | 'upcoming' | 'ok'} */
export function getDueStatus(dateStr, warningDays = DUE_WARNING_DAYS) {
  if (!dateStr) return "missing";
  const days = daysUntil(dateStr);
  if (days == null) return "missing";
  if (days < 0) return "overdue";
  if (days <= warningDays) return "upcoming";
  return "ok";
}

export function dueStatusLabel(status) {
  switch (status) {
    case "missing": return "Pendente";
    case "overdue": return "Vencido";
    case "upcoming": return "Próximo";
    default: return "Em dia";
  }
}

export function dueStatusBadgeVariant(status) {
  switch (status) {
    case "overdue": return "destructive";
    case "upcoming": return "secondary";
    case "missing": return "outline";
    default: return "default";
  }
}
