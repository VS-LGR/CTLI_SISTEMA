export function adequacyStatusLabel(status) {
  if (status === "concluida") return "Concluída";
  if (status === "rascunho") return "Rascunho";
  return status || "—";
}

export function selectionOpinionLabel(approved) {
  if (approved === true) return "Aprovado";
  if (approved === false) return "Reprovado";
  return "Pendente";
}

export function isMonitoringOverdue(isoDate) {
  if (!isoDate) return false;
  const today = new Date().toISOString().slice(0, 10);
  return String(isoDate).slice(0, 10) < today;
}
