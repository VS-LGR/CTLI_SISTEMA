import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { getHelpModuleByKey, resolveHelpModule } from "@/lib/help/helpModules";
import { hasSeenTour, markTourSeen, resetTour } from "@/lib/help/tourStorage";

/**
 * Controla o overlay de tutorial na primeira visita (não-admin).
 * `openTour(moduleKey)` reabre a partir da página Ajuda.
 */
export function useModuleTour() {
  const { user } = useAuth();
  const location = useLocation();
  const isAdmin = user?.role === "admin";
  const userId = user?.id || user?.email || null;

  const moduleFromPath = useMemo(
    () => resolveHelpModule(location.pathname),
    [location.pathname],
  );

  const [open, setOpen] = useState(false);
  const [forcedModuleKey, setForcedModuleKey] = useState(null);
  const [stepIndex, setStepIndex] = useState(0);

  const resolvedModule = useMemo(() => {
    if (forcedModuleKey) return getHelpModuleByKey(forcedModuleKey);
    return moduleFromPath;
  }, [forcedModuleKey, moduleFromPath]);

  useEffect(() => {
    setStepIndex(0);
    if (forcedModuleKey) {
      setOpen(Boolean(getHelpModuleByKey(forcedModuleKey)));
      return;
    }
    if (isAdmin || !userId || !moduleFromPath) {
      setOpen(false);
      return;
    }
    // Na própria página Ajuda não dispara overlay automático
    if (moduleFromPath.moduleKey === "ajuda") {
      setOpen(false);
      return;
    }
    setOpen(!hasSeenTour(userId, moduleFromPath.moduleKey));
  }, [isAdmin, userId, moduleFromPath, forcedModuleKey, location.pathname]);

  const dismiss = useCallback(() => {
    const key = resolvedModule?.moduleKey;
    if (key && userId) markTourSeen(userId, key);
    setForcedModuleKey(null);
    setOpen(false);
    setStepIndex(0);
  }, [resolvedModule, userId]);

  const openTour = useCallback((moduleKey) => {
    if (!moduleKey) return;
    if (userId) resetTour(userId, moduleKey);
    setForcedModuleKey(moduleKey);
    setStepIndex(0);
    setOpen(true);
  }, [userId]);

  return {
    open,
    module: resolvedModule,
    stepIndex,
    setStepIndex,
    dismiss,
    openTour,
    isForced: Boolean(forcedModuleKey),
  };
}
