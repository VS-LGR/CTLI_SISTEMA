import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import api, { formatApiError } from "@/lib/api";

const AuthCtx = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // null = checking, false = unauth, object = authed
  const [currentTenantId, setCurrentTenantId] = useState(
    () => localStorage.getItem("pv_current_tenant") || null
  );

  const refreshMe = useCallback(async () => {
    try {
      const { data } = await api.get("/auth/me");
      setUser(data);
      if (data.role === "client" && data.tenant_id) {
        setCurrentTenantId(data.tenant_id);
        localStorage.setItem("pv_current_tenant", data.tenant_id);
      }
      return data;
    } catch (e) {
      setUser(false);
      return null;
    }
  }, []);

  useEffect(() => {
    refreshMe();
  }, [refreshMe]);

  const login = async (email, password) => {
    try {
      const { data } = await api.post("/auth/login", { email, password });
      if (data.access_token) localStorage.setItem("pv_token", data.access_token);
      setUser(data);
      if (data.role === "client" && data.tenant_id) {
        setCurrentTenantId(data.tenant_id);
        localStorage.setItem("pv_current_tenant", data.tenant_id);
      }
      return { ok: true, user: data };
    } catch (e) {
      return { ok: false, error: formatApiError(e.response?.data?.detail) || e.message };
    }
  };

  const logout = async () => {
    try { await api.post("/auth/logout"); } catch (_) {}
    localStorage.removeItem("pv_token");
    localStorage.removeItem("pv_current_tenant");
    setCurrentTenantId(null);
    setUser(false);
  };

  const selectTenant = (tid) => {
    setCurrentTenantId(tid);
    if (tid) localStorage.setItem("pv_current_tenant", tid);
    else localStorage.removeItem("pv_current_tenant");
  };

  return (
    <AuthCtx.Provider value={{ user, login, logout, refreshMe, currentTenantId, selectTenant }}>
      {children}
    </AuthCtx.Provider>
  );
};

export const useAuth = () => useContext(AuthCtx);
