import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  adaptHelpModuleForUser,
  getHelpModuleByKey,
  resolveHelpModule,
} from "@/lib/help/helpModules";
import { hasSeenTour, markTourSeen, resetTour } from "@/lib/help/tourStorage";

/**
 * Controla o overlay de tutorial na primeira visita (não-admin).
 * `openTour(moduleKey)` reabre a partir da página Ajuda.
 */
export function useModuleTour({ currentTenant = null } = {}) {
  const { user } = useAuth();
  const location = useLocation();
  const isAdmin = user?.role === "admin";
  const userId = user?.id || user?.email || null;

  const accessCtx = useMemo(
    () => ({ tenant: currentTenant, role: user?.role, user }),
    [currentTenant, user],
  );

  const moduleFromPath = useMemo(() => {
    const raw = resolveHelpModule(location.pathname);
    return adaptHelpModuleForUser(raw, accessCtx);
  }, [location.pathname, accessCtx]);

  const [open, setOpen] = useState(false);
  const [forcedModuleKey, setForcedModuleKey] = useState(null);
  const [stepIndex, setStepIndex] = useState(0);

  const resolvedModule = useMemo(() => {
    if (forcedModuleKey) {
      return adaptHelpModuleForUser(getHelpModuleByKey(forcedModuleKey), accessCtx);
    }
    return moduleFromPath;
  }, [forcedModuleKey, moduleFromPath, accessCtx]);

  useEffect(() => {
    setStepIndex(0);
    if (forcedModuleKey) {
      setOpen(Boolean(adaptHelpModuleForUser(getHelpModuleByKey(forcedModuleKey), accessCtx)));
      return;
    }
    if (isAdmin || !userId || !moduleFromPath) {
      setOpen(false);
      return;
    }
    if (moduleFromPath.moduleKey === "ajuda") {
      setOpen(false);
      return;
    }
    setOpen(!hasSeenTour(userId, moduleFromPath.moduleKey));
  }, [isAdmin, userId, moduleFromPath, forcedModuleKey, location.pathname, accessCtx]);

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
