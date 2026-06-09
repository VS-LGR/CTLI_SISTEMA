import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchPersonnelRegistrosTopicRows,
  computePersonnelRegistrosTopicStats,
} from "@/lib/personnelDashboardStats";

export function usePersonnelRegistrosTopicStats(tenantId, externalFilters = {}) {
  const [rowsByTopic, setRowsByTopic] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!tenantId) {
      setRowsByTopic({});
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchPersonnelRegistrosTopicRows(tenantId);
      setRowsByTopic(rows);
    } catch (e) {
      setError(e);
      setRowsByTopic({});
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    load();
  }, [load]);

  const topicStats = useMemo(
    () => computePersonnelRegistrosTopicStats(rowsByTopic, externalFilters),
    [rowsByTopic, externalFilters],
  );

  return { topicStats, loading, error, reload: load };
}
