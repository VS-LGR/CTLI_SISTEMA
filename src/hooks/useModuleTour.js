import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  adaptHelpModuleForUser,
  getHelpModuleByKey,
  getTourPathForStep,
  resolveHelpModule,
} from "@/lib/help/helpModules";
import { hasSeenTour, markTourSeen, resetTour } from "@/lib/help/tourStorage";

function pathMatchesTour(pathname, tourPath) {
  if (!tourPath) return true;
  const base = String(tourPath).split("?")[0];
  return pathname === base || pathname.startsWith(`${base}/`);
}

/**
 * Controla o overlay de tutorial na primeira visita (não-admin).
 * `openTour(moduleKey)` navega para a página do módulo e ilumina os botões reais.
 */
export function useModuleTour({ currentTenant = null } = {}) {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
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
  const [pendingOpen, setPendingOpen] = useState(null);

  const resolvedModule = useMemo(() => {
    if (forcedModuleKey) {
      return adaptHelpModuleForUser(getHelpModuleByKey(forcedModuleKey), accessCtx);
    }
    return moduleFromPath;
  }, [forcedModuleKey, moduleFromPath, accessCtx]);

  const currentStep = resolvedModule?.steps?.[stepIndex] || resolvedModule?.steps?.[0];
  const neededPath = resolvedModule
    ? getTourPathForStep(resolvedModule, currentStep)
    : null;

  // Após navegação pedida pelo tour, abrir o overlay
  useEffect(() => {
    if (!pendingOpen) return;
    const { moduleKey, step } = pendingOpen;
    const mod = adaptHelpModuleForUser(getHelpModuleByKey(moduleKey), accessCtx);
    if (!mod) {
      setPendingOpen(null);
      return;
    }
    const stepDef = mod.steps?.[step] || mod.steps?.[0];
    const target = getTourPathForStep(mod, stepDef);
    if (!pathMatchesTour(location.pathname, target)) return;

    setForcedModuleKey(moduleKey);
    setStepIndex(step || 0);
    setOpen(true);
    setPendingOpen(null);
  }, [pendingOpen, location.pathname, accessCtx]);

  useEffect(() => {
    if (pendingOpen) return;
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
  }, [isAdmin, userId, moduleFromPath, forcedModuleKey, location.pathname, accessCtx, pendingOpen]);

  // Se o passo exige outra rota (ex.: editor), navegar ao mudar de passo
  useEffect(() => {
    if (!open || !resolvedModule || !neededPath) return;
    if (pathMatchesTour(location.pathname, neededPath)) return;
    navigate(neededPath);
  }, [open, resolvedModule, neededPath, location.pathname, navigate]);

  const dismiss = useCallback(() => {
    const key = resolvedModule?.moduleKey;
    if (key && userId) markTourSeen(userId, key);
    setForcedModuleKey(null);
    setPendingOpen(null);
    setOpen(false);
    setStepIndex(0);
  }, [resolvedModule, userId]);

  const openTour = useCallback((moduleKey) => {
    if (!moduleKey) return;
    const mod = adaptHelpModuleForUser(getHelpModuleByKey(moduleKey), accessCtx);
    if (!mod) return;
    if (userId) resetTour(userId, moduleKey);

    const first = mod.steps?.[0];
    const target = getTourPathForStep(mod, first);

    if (!pathMatchesTour(location.pathname, target)) {
      setPendingOpen({ moduleKey, step: 0 });
      setOpen(false);
      navigate(target);
      return;
    }

    setForcedModuleKey(moduleKey);
    setStepIndex(0);
    setOpen(true);
  }, [userId, accessCtx, location.pathname, navigate]);

  const setStepIndexSafe = useCallback((next) => {
    setStepIndex(typeof next === "function" ? next : next);
  }, []);

  return {
    open: open && Boolean(resolvedModule) && pathMatchesTour(location.pathname, neededPath),
    module: resolvedModule,
    stepIndex,
    setStepIndex: setStepIndexSafe,
    dismiss,
    openTour,
    isForced: Boolean(forcedModuleKey),
  };
}
