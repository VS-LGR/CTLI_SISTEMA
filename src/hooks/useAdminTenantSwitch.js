import { startTransition, useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { setTenantSwitchNotice } from "@/lib/tenantSwitchNotice";

const SWITCH_LOADER_MS = 400;

export function useAdminTenantSwitch({
  navigate,
  selectTenant,
  currentTenantId,
  tenants = [],
}) {
  const [pendingTenantId, setPendingTenantId] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [switching, setSwitching] = useState(false);

  const tenantById = useMemo(
    () => Object.fromEntries((tenants || []).map((t) => [t.id, t])),
    [tenants],
  );

  const currentTenant = tenantById[currentTenantId] || null;
  const pendingTenant = pendingTenantId ? tenantById[pendingTenantId] : null;

  const requestSwitch = useCallback(
    (tenantId) => {
      if (!tenantId || tenantId === currentTenantId) return;
      setPendingTenantId(tenantId);
      setConfirmOpen(true);
    },
    [currentTenantId],
  );

  const cancelSwitch = useCallback(() => {
    setConfirmOpen(false);
    setPendingTenantId(null);
  }, []);

  const confirmSwitch = useCallback(() => {
    if (!pendingTenantId) return;
    const next = tenantById[pendingTenantId];
    const nextName = next?.name || "Ambiente selecionado";

    setConfirmOpen(false);
    setSwitching(true);
    selectTenant(pendingTenantId);
    setTenantSwitchNotice(nextName);
    startTransition(() => {
      navigate("/dashboard", { replace: true });
    });
    toast.success(`Ambiente alterado: ${nextName}`);

    window.setTimeout(() => {
      setSwitching(false);
      setPendingTenantId(null);
    }, SWITCH_LOADER_MS);
  }, [pendingTenantId, tenantById, selectTenant, navigate]);

  return {
    confirmOpen,
    setConfirmOpen,
    switching,
    currentTenant,
    pendingTenant,
    requestSwitch,
    cancelSwitch,
    confirmSwitch,
  };
}
