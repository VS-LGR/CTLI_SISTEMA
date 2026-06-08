import { useEffect, useMemo } from "react";
import { filterPersonnelTopicRows } from "@/lib/personnelRegistrosListUtils";

export function useFilteredPersonnelRows(rows, externalFilters, topicId) {
  return useMemo(() => {
    if (!externalFilters?.query && !externalFilters?.date) return rows || [];
    return filterPersonnelTopicRows(rows, externalFilters, topicId);
  }, [rows, externalFilters, topicId]);
}

export function usePersonnelRowCountEffect(displayRows, onRowCountChange) {
  useEffect(() => {
    onRowCountChange?.(displayRows?.length ?? 0);
  }, [displayRows, onRowCountChange]);
}

export function personnelPanelCardClass(compact) {
  return compact ? "border-slate-100 shadow-none bg-transparent" : "border-slate-200";
}
