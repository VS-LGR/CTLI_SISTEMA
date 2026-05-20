import api, { asArray, isMockApiMode, isSupabaseAuthMode } from "@/lib/api";
import { supabase } from "@/lib/supabaseClient";

async function invokeTenantBackup(body) {
  if (!supabase) throw new Error("Supabase não configurado");
  const { data, error } = await supabase.functions.invoke("tenant-backup", { body });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

export function base64ToBlob(b64, mime = "application/zip") {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export function triggerBlobDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function listBackupStatus(tenantId) {
  if (isSupabaseAuthMode) {
    return invokeTenantBackup({ action: "list", tenant_id: tenantId });
  }
  const { data: raw } = await api.get(`/tenants/${tenantId}/backups`);
  return {
    last_backup_at: raw?.last_backup_at ?? null,
    auto_interval_days: raw?.auto_interval_days ?? 20,
    storage_mode: "local",
  };
}

export async function createBackup(tenantId) {
  if (isSupabaseAuthMode) {
    return invokeTenantBackup({ action: "create", tenant_id: tenantId });
  }
  const { data } = await api.post(`/tenants/${tenantId}/backup`);
  return data;
}

/** Gera o ZIP e inicia o download no browser; atualiza last_backup_at no servidor. */
export async function createAndDownloadBackup(tenantId) {
  const data = await createBackup(tenantId);
  if (data?.zip_base64 && data?.filename) {
    triggerBlobDownload(base64ToBlob(data.zip_base64), data.filename);
  } else if (isMockApiMode) {
    throw new Error("Resposta de backup sem arquivo ZIP");
  }
  return data;
}

export async function restoreBackup(tenantId, file, replace) {
  if (isSupabaseAuthMode) {
    if (!supabase) throw new Error("Supabase não configurado");
    const fd = new FormData();
    fd.append("file", file);
    fd.append("action", "restore");
    fd.append("tenant_id", tenantId);
    fd.append("replace", replace ? "true" : "false");

    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    const url = `${process.env.REACT_APP_SUPABASE_URL}/functions/v1/tenant-backup`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: token ? `Bearer ${token}` : "",
        apikey: process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_PUBLISHABLE_KEY || "",
      },
      body: fd,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Falha na restauração");
    return data;
  }

  const fd = new FormData();
  fd.append("file", file);
  const { data } = await api.post(`/tenants/${tenantId}/restore?replace=${replace}`, fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export function formatRestoreMessage(data) {
  const parts = [];
  if (data.documents_restored != null) parts.push(`${data.documents_restored} documentos`);
  if (data.responsibles_restored != null) parts.push(`${data.responsibles_restored} responsáveis`);
  if (data.cadastros_restored != null && data.cadastros_restored > 0) {
    parts.push(`${data.cadastros_restored} registos de cadastros`);
  }
  if (data.coleta_restored != null && data.coleta_restored > 0) {
    parts.push(`${data.coleta_restored} coletas`);
  }
  if (data.storage_files_restored != null && data.storage_files_restored > 0) {
    parts.push(`${data.storage_files_restored} ficheiros`);
  }
  if (parts.length === 0) return "Restauração concluída (nenhum item importado).";
  let msg = `Restaurados: ${parts.join(", ")}.`;
  if (data.legacy_api_available === false) {
    msg += " Documentos da API legada não foram incluídos (API indisponível).";
  }
  if (data.detail) msg += ` ${data.detail}`;
  return msg;
}
