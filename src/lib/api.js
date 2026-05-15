import axios from "axios";
import { createMockApiClient } from "@/lib/mockBackend";

/** Quando true, não há chamadas HTTP à API real — dados vêm do mock em `mockBackend.js`. */
export const isMockApiMode = process.env.REACT_APP_USE_MOCK_API === "true";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API_BASE = isMockApiMode
  ? `${typeof window !== "undefined" ? window.location.origin : ""}/mock-api`
  : `${BACKEND_URL}/api`;

const api = isMockApiMode
  ? createMockApiClient()
  : axios.create({
      baseURL: API_BASE,
      withCredentials: true,
    });

if (!isMockApiMode) {
  api.interceptors.request.use((config) => {
    const token = localStorage.getItem("pv_token");
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });
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
