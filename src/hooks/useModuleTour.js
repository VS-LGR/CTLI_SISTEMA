import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  const role = user?.role ?? null;

  const accessCtx = useMemo(
    () => ({ tenant: currentTenant, role, user }),
    [currentTenant, role, user],
  );

  const moduleFromPath = useMemo(() => {
    const raw = resolveHelpModule(location.pathname);
    return adaptHelpModuleForUser(raw, accessCtx);
  }, [location.pathname, accessCtx]);

  const [open, setOpen] = useState(false);
  const [forcedModuleKey, setForcedModuleKey] = useState(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [pendingOpen, setPendingOpen] = useState(null);
  const lastNavigatedPathRef = useRef(null);
  const navigateCountRef = useRef(0);

  const resolvedModule = useMemo(() => {
    if (forcedModuleKey) {
      return adaptHelpModuleForUser(getHelpModuleByKey(forcedModuleKey), accessCtx);
    }
    return moduleFromPath;
  }, [forcedModuleKey, moduleFromPath, accessCtx]);

  const steps = resolvedModule?.steps || [];
  const safeStepIndex = steps.length ? Math.min(stepIndex, steps.length - 1) : 0;
  const currentStep = steps[safeStepIndex] || steps[0];
  const neededPath = resolvedModule
    ? getTourPathForStep(resolvedModule, currentStep)
    : null;
  const pathReady = Boolean(neededPath) && pathMatchesTour(location.pathname, neededPath);

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
    if (!pathMatchesTour(location.pathname, target)) {
      const onHome = location.pathname === "/dashboard" || location.pathname === "/";
      if (onHome && !pathMatchesTour("/dashboard", target)) {
        setPendingOpen(null);
      }
      return;
    }

    setForcedModuleKey(moduleKey);
    setStepIndex(step || 0);
    setOpen(true);
    setPendingOpen(null);
    lastNavigatedPathRef.current = null;
    navigateCountRef.current = 0;
  }, [pendingOpen, location.pathname, accessCtx]);

  const moduleKeyFromPath = moduleFromPath?.moduleKey ?? null;

  useEffect(() => {
    if (pendingOpen || forcedModuleKey) return;
    if (isAdmin || !userId || !moduleKeyFromPath) {
      setOpen(false);
      return;
    }
    if (moduleKeyFromPath === "ajuda") {
      setOpen(false);
      return;
    }
    setOpen(!hasSeenTour(userId, moduleKeyFromPath));
    setStepIndex(0);
  }, [isAdmin, userId, moduleKeyFromPath, forcedModuleKey, pendingOpen]);

  // Navegar no máximo uma vez por neededPath; abortar se houver thrashing
  useEffect(() => {
    if (!open || !neededPath || pendingOpen) return;
    if (pathMatchesTour(location.pathname, neededPath)) {
      lastNavigatedPathRef.current = null;
      return;
    }
    if (lastNavigatedPathRef.current === neededPath) return;
    if (navigateCountRef.current >= 3) {
      setOpen(false);
      setForcedModuleKey(null);
      setPendingOpen(null);
      return;
    }
    lastNavigatedPathRef.current = neededPath;
    navigateCountRef.current += 1;
    navigate(neededPath);
  }, [open, neededPath, location.pathname, navigate, pendingOpen]);

  const dismiss = useCallback(() => {
    const key = resolvedModule?.moduleKey;
    if (key && userId) markTourSeen(userId, key);
    setForcedModuleKey(null);
    setPendingOpen(null);
    setOpen(false);
    setStepIndex(0);
    lastNavigatedPathRef.current = null;
    navigateCountRef.current = 0;
  }, [resolvedModule?.moduleKey, userId]);

  const openTour = useCallback((moduleKey) => {
    if (!moduleKey) return;
    const mod = adaptHelpModuleForUser(getHelpModuleByKey(moduleKey), accessCtx);
    if (!mod || !(mod.steps || []).length) return;
    if (userId) resetTour(userId, moduleKey);

    const first = mod.steps[0];
    const target = getTourPathForStep(mod, first);
    lastNavigatedPathRef.current = null;
    navigateCountRef.current = 0;

    setForcedModuleKey(null);
    setOpen(false);
    setStepIndex(0);

    if (!pathMatchesTour(location.pathname, target)) {
      setPendingOpen({ moduleKey, step: 0 });
      navigate(target);
      return;
    }

    setPendingOpen(null);
    setForcedModuleKey(moduleKey);
    setStepIndex(0);
    setOpen(true);
  }, [userId, accessCtx, location.pathname, navigate]);

  const setStepIndexSafe = useCallback((next) => {
    lastNavigatedPathRef.current = null;
    setStepIndex((prev) => {
      const value = typeof next === "function" ? next(prev) : next;
      return typeof value === "number" && value >= 0 ? value : prev;
    });
  }, []);

  const overlayOpen = open && Boolean(resolvedModule) && pathReady && !pendingOpen;

  return {
    open: overlayOpen,
    module: resolvedModule,
    stepIndex: safeStepIndex,
    setStepIndex: setStepIndexSafe,
    dismiss,
    openTour,
    isForced: Boolean(forcedModuleKey),
  };
}
