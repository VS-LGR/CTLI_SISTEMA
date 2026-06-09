import { useCallback, useEffect, useState } from "react";
import { fetchPersonnelComplianceStats } from "@/lib/personnelDashboardStats";

const EMPTY_COMPLIANCE = {
  withoutCompletedAdequacy: 0,
  overdueMonitoring: 0,
  pendingExperience: 0,
};

export function usePersonnelComplianceStats(tenantId) {
  const [compliance, setCompliance] = useState(EMPTY_COMPLIANCE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!tenantId) {
      setCompliance(EMPTY_COMPLIANCE);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPersonnelComplianceStats(tenantId);
      setCompliance(data);
    } catch (e) {
      setError(e);
      setCompliance(EMPTY_COMPLIANCE);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    load();
  }, [load]);

  return { compliance, loading, error, reload: load };
}
