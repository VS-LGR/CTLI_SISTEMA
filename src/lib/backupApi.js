import api, { asArray, isMockApiMode, isSupabaseAuthMode } from "@/lib/api";
import { supabase } from "@/lib/supabaseClient";

async function invokeTenantBackup(body) {
  if (!supabase) throw new Error("Supabase não configurado");
  const { data, error } = await supabase.functions.invoke("tenant-backup", { body });
  if (data?.error) throw new Error(data.error);
  if (error) {
    // functions.invoke muitas vezes esconde o JSON de erro 5xx
    let detail = error.message || "Falha na função tenant-backup";
    try {
      const ctx = error.context;
      if (ctx && typeof ctx.json === "function") {
        const payload = await ctx.json();
        if (payload?.error) detail = payload.error;
      } else if (typeof error === "object" && error !== null && "message" in error) {
        detail = String(error.message);
      }
    } catch { /* ignore */ }
    throw new Error(detail);
  }
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
    backup_retention_days: raw?.backup_retention_days ?? 90,
    storage_mode: "local",
    backups: asArray(raw?.backups),
    events: asArray(raw?.events),
  };
}

export async function createBackup(tenantId) {
  if (isSupabaseAuthMode) {
    return invokeTenantBackup({ action: "create", tenant_id: tenantId });
  }
  const { data } = await api.post(`/tenants/${tenantId}/backup`);
  return data;
}

/**
 * Gera o ZIP (Storage privado + URL assinada) e inicia o download no browser.
 * Fallback legado: zip_base64 na resposta.
 */
export async function createAndDownloadBackup(tenantId) {
  const data = await createBackup(tenantId);
  const filename = data?.filename || `backup-${tenantId.slice(0, 8)}.zip`;

  if (data?.download_url) {
    const res = await fetch(data.download_url);
    if (!res.ok) throw new Error("Falha ao descarregar o ZIP assinado");
    const blob = await res.blob();
    triggerBlobDownload(blob, filename);
  } else if (data?.zip_base64) {
    triggerBlobDownload(base64ToBlob(data.zip_base64), filename);
  } else if (isMockApiMode) {
    throw new Error("Resposta de backup sem arquivo ZIP");
  } else {
    throw new Error("Resposta de backup sem download_url");
  }
  return data;
}

async function postBackupMultipart(tenantId, file, { action, replace, confirmPassword, confirmPhrase }) {
  if (!supabase) throw new Error("Supabase não configurado");
  const fd = new FormData();
  fd.append("file", file);
  fd.append("action", action);
  fd.append("tenant_id", tenantId);
  fd.append("replace", replace ? "true" : "false");
  if (confirmPassword) fd.append("confirm_password", confirmPassword);
  if (confirmPhrase) fd.append("confirm_phrase", confirmPhrase);

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
  if (!res.ok) {
    const err = data?.error || `Falha na ação ${action}`;
    if (/Ação desconhecida/i.test(err)) {
      throw new Error(`${err} (é necessário redeploy da função tenant-backup)`);
    }
    throw new Error(err);
  }
  return data;
}

export async function dryRunBackup(tenantId, file) {
  if (isSupabaseAuthMode) {
    return postBackupMultipart(tenantId, file, { action: "dry_run", replace: false });
  }
  throw new Error("Dry-run disponível apenas em modo Supabase");
}

export async function restoreBackup(tenantId, file, replace, { confirmPassword, confirmPhrase } = {}) {
  if (isSupabaseAuthMode) {
    return postBackupMultipart(tenantId, file, {
      action: "restore",
      replace,
      confirmPassword,
      confirmPhrase,
    });
  }

  const fd = new FormData();
  fd.append("file", file);
  const { data } = await api.post(`/tenants/${tenantId}/restore?replace=${replace}`, fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export function shortHash(sha256) {
  if (!sha256 || typeof sha256 !== "string") return "";
  return `${sha256.slice(0, 10)}…${sha256.slice(-6)}`;
}

export function formatRestoreMessage(data) {
  const parts = [];
  if (data.records_restored != null) parts.push(`${data.records_restored} registos`);
  if (data.documents_restored != null) parts.push(`${data.documents_restored} documentos`);
  if (data.responsibles_restored != null) parts.push(`${data.responsibles_restored} responsáveis`);
  if (data.cadastros_restored != null && data.cadastros_restored > 0) {
    parts.push(`${data.cadastros_restored} cadastros`);
  }
  if (data.coleta_restored != null && data.coleta_restored > 0) {
    parts.push(`${data.coleta_restored} coletas`);
  }
  if (data.certificates_restored != null && data.certificates_restored > 0) {
    parts.push(`${data.certificates_restored} certificados`);
  }
  if (data.master_documents_restored != null && data.master_documents_restored > 0) {
    parts.push(`${data.master_documents_restored} docs. lista mestra`);
  }
  if (data.storage_files_restored != null && data.storage_files_restored > 0) {
    parts.push(`${data.storage_files_restored} ficheiros`);
  }
  if (parts.length === 0) return "Restauração concluída (nenhum item importado).";
  let msg = `Restaurados: ${parts.join(", ")}.`;
  if (data.integrity_verified) {
    msg += ` Integridade SHA-256 OK (${data.integrity_files_checked || 0} ficheiros).`;
  }
  if (data.pre_replace_backup?.storage_path) {
    msg += ` Backup de segurança gerado antes do replace.`;
  }
  if (data.sha256) msg += ` Hash: ${shortHash(data.sha256)}.`;
  if (data.legacy_api_available === false) {
    msg += " Documentos da API legada não foram incluídos (API indisponível).";
  }
  if (data.detail) msg += ` ${data.detail}`;
  return msg;
}

export function formatDryRunSummary(report) {
  if (!report?.dry_run) return "Dry-run inválido";
  const parts = [
    `ZIP: ${report.zip_total_records ?? 0} registos (tabelas)`,
    `Ambiente: ${report.live_total_records ?? 0} registos`,
  ];
  if (report.zip_storage_files != null) {
    parts.push(`${report.zip_storage_files} ficheiros storage no ZIP`);
  }
  if (report.integrity_verified) parts.push("integridade OK");
  if (report.warnings?.length) parts.push(`${report.warnings.length} aviso(s)`);
  return parts.join(" · ");
}
