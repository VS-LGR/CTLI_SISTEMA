import { useCallback, useEffect, useState } from "react";
import { fetchPersonnelPipeline } from "@/lib/personnelPipelineStats";

const EMPTY_PIPELINE = {
  active: [],
  completed: [],
  rejected: [],
  stageCounts: {
    aguardando_admissao: 0,
    em_experiencia: 0,
    experiencia_aprovada: 0,
    adequacao_concluida: 0,
  },
};

export function usePersonnelPipeline(tenantId) {
  const [pipeline, setPipeline] = useState(EMPTY_PIPELINE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!tenantId) {
      setPipeline(EMPTY_PIPELINE);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPersonnelPipeline(tenantId);
      setPipeline(data);
    } catch (e) {
      setError(e);
      setPipeline(EMPTY_PIPELINE);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    load();
  }, [load]);

  return { pipeline, loading, error, reload: load };
}
