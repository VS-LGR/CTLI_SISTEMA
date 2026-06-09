import { useEffect, useMemo, useRef } from "react";
import { computePersonnelTopicStats, filterPersonnelTopicRows } from "@/lib/personnelRegistrosListUtils";

export function useFilteredPersonnelRows(rows, externalFilters, topicId) {
  return useMemo(() => {
    if (!externalFilters?.query && !externalFilters?.date) return rows || [];
    return filterPersonnelTopicRows(rows, externalFilters, topicId);
  }, [rows, externalFilters, topicId]);
}

export function usePersonnelTopicStatsEffect(displayRows, topicId, onTopicStatsChange) {
  const stats = useMemo(
    () => computePersonnelTopicStats(topicId, displayRows),
    [displayRows, topicId],
  );
  const onTopicStatsChangeRef = useRef(onTopicStatsChange);
  onTopicStatsChangeRef.current = onTopicStatsChange;

  const statsSig = [
    stats.total,
    stats.attention,
    stats.activePositions,
    stats.obsoletePositions,
    stats.completedAdequacies,
    stats.draftAdequacies,
    stats.overdueMonitorings,
    stats.needsTraining,
    stats.approvedExperience,
    stats.rejectedExperience,
    stats.pendingOpinion,
    stats.approvedSelections,
    stats.rejectedSelections,
    stats.pendingSelections,
    stats.totalParticipantsApproved,
    stats.totalParticipantsReproved,
  ].join("|");

  useEffect(() => {
    onTopicStatsChangeRef.current?.(stats);
  }, [stats, statsSig]);
}

export function personnelPanelCardClass(compact) {
  return compact ? "border-slate-100 shadow-none bg-transparent" : "border-slate-200";
}
