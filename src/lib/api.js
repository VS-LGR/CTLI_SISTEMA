import axios from "axios";
import { createMockApiClient } from "@/lib/mockBackend";
import { isSupabaseConfigured } from "@/lib/supabaseClient";

/** Quando true, não há chamadas HTTP à API real — dados vêm do mock em `mockBackend.js`. */
export const isMockApiMode = process.env.REACT_APP_USE_MOCK_API === "true";

/** Auth e CRUD administrativo via Supabase; documentos podem continuar em `REACT_APP_BACKEND_URL` (fase 2). */
export const isSupabaseAuthMode = isSupabaseConfigured && !isMockApiMode;

const BACKEND_URL = (process.env.REACT_APP_BACKEND_URL || "").trim();
export const API_BASE = isMockApiMode
  ? `${typeof window !== "undefined" ? window.location.origin : ""}/mock-api`
  : BACKEND_URL
    ? `${BACKEND_URL}/api`
    : "";

const api = isMockApiMode
  ? createMockApiClient()
  : axios.create({
      baseURL: API_BASE || "/",
      withCredentials: true,
    });

if (!isMockApiMode && BACKEND_URL) {
  api.interceptors.request.use((config) => {
    const token = localStorage.getItem("pv_token");
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });
}

/** Normaliza corpo de listagem da API (array direto ou envelope `{ items, documents, ... }`). */
export function asArray(data) {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    for (const key of ["items", "results", "data", "documents", "tenants", "responsibles", "backups"]) {
      if (Array.isArray(data[key])) return data[key];
    }
  }
  if (process.env.NODE_ENV === "development" && data != null) {
    console.warn("[asArray] Resposta de lista não reconhecida:", data);
  }
  return [];
}

export function formatApiError(detail) {
  if (detail == null) return "Algo deu errado. Tente novamente.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail.map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e))).join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}

export default api;
