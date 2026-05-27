const STORAGE_KEY = "pv_tenant_switch_notice";

export function setTenantSwitchNotice(tenantName) {
  if (!tenantName) return;
  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ name: tenantName, at: Date.now() }),
    );
  } catch {
    /* ignore quota / private mode */
  }
}

export function consumeTenantSwitchNotice() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(STORAGE_KEY);
    const parsed = JSON.parse(raw);
    if (parsed?.name) return parsed;
  } catch {
    sessionStorage.removeItem(STORAGE_KEY);
  }
  return null;
}
