import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import api, { formatApiError, isMockApiMode, isSupabaseAuthMode } from "@/lib/api";
import { supabase } from "@/lib/supabaseClient";

const AuthCtx = createContext(null);

function mapProfileToUser(row, fallbackEmail) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.full_name || "",
    email: row.email || fallbackEmail || "",
    role: row.role,
    tenant_id: row.tenant_id ?? null,
  };
}

/** Utilizadores não-CTLI com tenant fixam o ambiente atual (portal cliente ou staff no mesmo tenant). */
function profileIndicatesTenant(data) {
  return Boolean(data && data.role !== "admin" && data.tenant_id);
}

async function loadUserFromSupabaseSession(session) {
  if (!supabase || !session?.user) return null;
  const u = session.user;
  const { data: row, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, tenant_id")
    .eq("id", u.id)
    .maybeSingle();
  if (error) throw error;
  return mapProfileToUser(row, u.email);
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // null = checking, false = unauth, object = authed
  const [currentTenantId, setCurrentTenantId] = useState(
    () => localStorage.getItem("pv_current_tenant") || null
  );

  const refreshLegacy = useCallback(async () => {
    try {
      const { data } = await api.get("/auth/me");
      setUser(data);
      if (profileIndicatesTenant(data)) {
        setCurrentTenantId(data.tenant_id);
        localStorage.setItem("pv_current_tenant", data.tenant_id);
      }
      return data;
    } catch (e) {
      setUser(false);
      return null;
    }
  }, []);

  const applySupabaseSession = useCallback(async (session) => {
    if (!session) {
      localStorage.removeItem("pv_token");
      setUser(false);
      return null;
    }
    localStorage.setItem("pv_token", session.access_token);
    const shaped = await loadUserFromSupabaseSession(session);
    if (!shaped) {
      setUser(false);
      return null;
    }
    setUser(shaped);
    if (profileIndicatesTenant(shaped)) {
      setCurrentTenantId(shaped.tenant_id);
      localStorage.setItem("pv_current_tenant", shaped.tenant_id);
    }
    return shaped;
  }, []);

  const refreshMe = useCallback(async () => {
    if (isMockApiMode || !isSupabaseAuthMode) {
      return refreshLegacy();
    }
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return await applySupabaseSession(session);
    } catch (e) {
      setUser(false);
      return null;
    }
  }, [applySupabaseSession, refreshLegacy]);

  useEffect(() => {
    if (isMockApiMode || !isSupabaseAuthMode) {
      refreshMe();
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!cancelled) await applySupabaseSession(session);
      } catch {
        if (!cancelled) setUser(false);
      }
    })();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!cancelled) applySupabaseSession(session).catch(() => setUser(false));
    });
    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [applySupabaseSession, refreshMe]);

  const login = async (email, password) => {
    if (isMockApiMode || !isSupabaseAuthMode) {
      try {
        const { data } = await api.post("/auth/login", { email, password });
        if (data.access_token) localStorage.setItem("pv_token", data.access_token);
        setUser(data);
        if (profileIndicatesTenant(data)) {
          setCurrentTenantId(data.tenant_id);
          localStorage.setItem("pv_current_tenant", data.tenant_id);
        }
        return { ok: true, user: data };
      } catch (e) {
        return { ok: false, error: formatApiError(e.response?.data?.detail) || e.message };
      }
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { ok: false, error: error.message };
      const shaped = await applySupabaseSession(data.session);
      return { ok: true, user: shaped };
    } catch (e) {
      return { ok: false, error: e?.message || "Falha no login" };
    }
  };

  const logout = async () => {
    if (isMockApiMode || !isSupabaseAuthMode) {
      try { await api.post("/auth/logout"); } catch (_) { /* ignore */ }
    } else {
      try { await supabase.auth.signOut(); } catch (_) { /* ignore */ }
    }
    localStorage.removeItem("pv_token");
    localStorage.removeItem("pv_current_tenant");
    setCurrentTenantId(null);
    setUser(false);
  };

  const selectTenant = useCallback((tid) => {
    setCurrentTenantId(tid);
    if (tid) localStorage.setItem("pv_current_tenant", tid);
    else localStorage.removeItem("pv_current_tenant");
  }, []);

  return (
    <AuthCtx.Provider value={{ user, login, logout, refreshMe, currentTenantId, selectTenant }}>
      {children}
    </AuthCtx.Provider>
  );
};

export const useAuth = () => useContext(AuthCtx);
