import { getPersonnelTopicById } from "@/lib/personnelRegistrosConfig";

function norm(s) {
  return String(s ?? "").trim().toLowerCase();
}

function rowHaystack(row, topic) {
  const parts = (topic.searchFields || []).map((f) => row?.[f]);
  if (topic.nestedSearch) parts.push(topic.nestedSearch(row));
  if (topic.code) parts.push(topic.code);
  return parts.map(norm).join(" ");
}

function rowDate(row, dateField) {
  const v = row?.[dateField];
  return v ? String(v).slice(0, 10) : "";
}

export const EMPTY_PERSONNEL_REGISTROS_FILTERS = { query: "", topic: "all", date: "" };

/**
 * Filtra linhas de um tópico específico (uso nos list panels).
 * @param {Array<Record<string, unknown>>} rows
 * @param {{ query?: string, date?: string }} externalFilters
 * @param {string} topicId
 */
export function filterPersonnelTopicRows(rows, externalFilters, topicId) {
  const topic = getPersonnelTopicById(topicId);
  if (!topic) return rows || [];
  const q = norm(externalFilters?.query);
  const d = String(externalFilters?.date ?? "").trim();
  if (!q && !d) return rows || [];

  return (rows || []).filter((row) => {
    if (q && !rowHaystack(row, topic).includes(q)) return false;
    if (d && rowDate(row, topic.dateField) !== d) return false;
    return true;
  });
}

export function hasActivePersonnelRegistrosFilters(filters) {
  return Boolean(
    filters?.query?.trim()
    || (filters?.topic && filters.topic !== "all")
    || filters?.date?.trim(),
  );
}

export function personnelRegistrosKpis({ totalAll = 0, totalFiltered = 0, activeGroups = 0 }) {
  return { totalAll, totalFiltered, activeGroups };
}
