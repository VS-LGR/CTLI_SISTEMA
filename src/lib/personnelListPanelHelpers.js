import { useEffect, useMemo, useRef } from "react";
import { filterPersonnelTopicRows } from "@/lib/personnelRegistrosListUtils";

export function useFilteredPersonnelRows(rows, externalFilters, topicId) {
  return useMemo(() => {
    if (!externalFilters?.query && !externalFilters?.date) return rows || [];
    return filterPersonnelTopicRows(rows, externalFilters, topicId);
  }, [rows, externalFilters, topicId]);
}

export function usePersonnelRowCountEffect(displayRows, onRowCountChange) {
  const count = displayRows?.length ?? 0;
  const onRowCountChangeRef = useRef(onRowCountChange);
  onRowCountChangeRef.current = onRowCountChange;

  useEffect(() => {
    onRowCountChangeRef.current?.(count);
  }, [count]);
}

export function personnelPanelCardClass(compact) {
  return compact ? "border-slate-100 shadow-none bg-transparent" : "border-slate-200";
}
