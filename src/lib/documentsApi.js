/**
 * Documentos — Supabase (produção) ou API mock/legada.
 */

import api, { asArray, isMockApiMode, isSupabaseAuthMode } from "@/lib/api";
import { supabase } from "@/lib/supabaseClient";

export const TENANT_DOCUMENTS_BUCKET = "tenant-documents";

/** Mensagem legível para erros de criação/edição de documentos (Supabase ou API). */
export function formatDocumentError(err) {
  if (!err) return "Algo deu errado. Tente novamente.";
  const msg = err.message || err.error_description || String(err);
  const code = err.code || err.status;

  if (
    code === "42P01"
    || code === "PGRST205"
    || /Could not find the table.*tenant_documents/i.test(msg)
    || (/tenant_documents/i.test(msg) && /(schema cache|does not exist|não existe)/i.test(msg))
  ) {
    return "Tabela de documentos não encontrada. Aplique a migração 20250626000000_tenant_documents.sql no Supabase.";
  }
  if (code === "42501" || /row-level security|permission denied/i.test(msg)) {
    return "Sem permissão para este ambiente. Confirme o ambiente selecionado no topo ou o perfil (admin/cliente).";
  }
  if (code === "23503") {
    return "Referência inválida (ambiente ou utilizador). Selecione o ambiente e tente de novo.";
  }
  if (code === "23514" || /check constraint/i.test(msg)) {
    return "Dados inválidos (requisito, secção ou estado). Recarregue a página e tente novamente.";
  }
  if (code === "PGRST116" || /0 rows/i.test(msg)) {
    return "Documento não foi gravado (permissão ou configuração). Verifique RLS e migrações no Supabase.";
  }
  if (/Configure Supabase|REACT_APP_BACKEND/i.test(msg)) {
    return msg;
  }
  return msg;
}

function normalizeDateField(value) {
  if (value == null || value === "") return null;
  const s = String(value).trim();
  return s || null;
}

function mapRow(row) {
  if (!row) return row;
  return {
    ...row,
    has_file: Boolean(row.has_file),
    pinned_at: row.pinned_at || null,
  };
}

function storagePath(tenantId, docId, fileName) {
  const safe = (fileName || "file").replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${tenantId}/${docId}/${Date.now()}_${safe}`;
}

// —— Supabase ——

async function listDocumentsSupabase(params) {
  let q = supabase.from("tenant_documents").select("*").eq("tenant_id", params.tenant_id);
  if (params.requirement) q = q.eq("requirement", String(params.requirement));
  if (params.section) q = q.eq("section", params.section);
  if (params.status) q = q.eq("status", params.status);
  if (params.folder_key) q = q.eq("folder_key", params.folder_key);
  if (params.q) {
    const term = `%${params.q}%`;
    q = q.or(`title.ilike.${term},code.ilike.${term},responsible.ilike.${term},file_name.ilike.${term}`);
  }
  q = q.order("updated_at", { ascending: false });
  const { data, error } = await q;
  if (error) throw error;
  return (data || []).map(mapRow);
}

async function getDocumentSupabase(id) {
  const { data, error } = await supabase.from("tenant_documents").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Documento não encontrado");
  return mapRow(data);
}

async function createDocumentSupabase(body, userId) {
  if (!body?.tenant_id) {
    throw new Error("Selecione um ambiente no topo antes de criar o documento.");
  }
  const row = {
    tenant_id: body.tenant_id,
    requirement: String(body.requirement),
    folder_key: body.folder_key && String(body.folder_key).trim() ? body.folder_key : null,
    section: body.section,
    title: body.title?.trim() || "",
    code: body.code || "",
    version: body.version || "1.0",
    responsible: body.responsible || "",
    review_date: normalizeDateField(body.review_date),
    content_html: body.content_html || "",
    status: body.status || "vigente",
    has_file: false,
    created_by: userId || null,
    updated_by: userId || null,
  };
  let { data, error } = await supabase.from("tenant_documents").insert(row).select("*").single();
  if (error?.code === "23503" && row.created_by) {
    const retry = { ...row, created_by: null, updated_by: null };
    ({ data, error } = await supabase.from("tenant_documents").insert(retry).select("*").single());
  }
  if (error) throw error;
  return mapRow(data);
}

async function updateDocumentSupabase(id, patch, userId) {
  const payload = { ...patch, updated_by: userId || null };
  delete payload.id;
  delete payload.tenant_id;
  delete payload.created_at;
  const { data, error } = await supabase.from("tenant_documents").update(payload).eq("id", id).select("*").single();
  if (error) throw error;
  return mapRow(data);
}

async function deleteDocumentSupabase(id) {
  const doc = await getDocumentSupabase(id);
  if (doc.storage_path) {
    await supabase.storage.from(TENANT_DOCUMENTS_BUCKET).remove([doc.storage_path]);
  }
  const { error } = await supabase.from("tenant_documents").delete().eq("id", id);
  if (error) throw error;
  return { ok: true };
}

async function uploadFileSupabase(docId, file, userId, contentHtml) {
  const doc = await getDocumentSupabase(docId);
  if (doc.storage_path) {
    await supabase.storage.from(TENANT_DOCUMENTS_BUCKET).remove([doc.storage_path]);
  }
  const path = storagePath(doc.tenant_id, doc.id, file.name);
  const { error: upErr } = await supabase.storage.from(TENANT_DOCUMENTS_BUCKET).upload(path, file, {
    upsert: false,
    contentType: file.type || undefined,
  });
  if (upErr) throw upErr;
  const patch = {
    storage_path: path,
    file_name: file.name,
    file_mime: file.type || "",
    has_file: true,
  };
  if (contentHtml != null) patch.content_html = contentHtml;
  return updateDocumentSupabase(docId, patch, userId);
}

async function signedDownloadUrlSupabase(doc) {
  if (!doc?.storage_path) return null;
  const { data, error } = await supabase.storage
    .from(TENANT_DOCUMENTS_BUCKET)
    .createSignedUrl(doc.storage_path, 3600);
  if (error) throw error;
  return data?.signedUrl || null;
}

async function togglePinSupabase(id, pinned, userId) {
  return updateDocumentSupabase(id, { pinned_at: pinned ? new Date().toISOString() : null }, userId);
}

// —— Legacy / mock API ——

async function listDocumentsApi(params) {
  const { data } = await api.get("/documents", { params });
  return asArray(data);
}

async function getDocumentApi(id) {
  const { data } = await api.get(`/documents/${id}`);
  return data;
}

async function createDocumentApi(body) {
  if (!isMockApiMode && !(process.env.REACT_APP_BACKEND_URL || "").trim()) {
    throw new Error(
      "Documentos requerem Supabase (REACT_APP_SUPABASE_URL + chave) ou REACT_APP_BACKEND_URL.",
    );
  }
  const { data } = await api.post("/documents", body);
  return data;
}

async function updateDocumentApi(id, patch) {
  const { data } = await api.put(`/documents/${id}`, patch);
  return data;
}

async function deleteDocumentApi(id) {
  await api.delete(`/documents/${id}`);
  return { ok: true };
}

async function uploadFileApi(docId, file) {
  const fd = new FormData();
  fd.append("file", file);
  const { data } = await api.post(`/documents/${docId}/upload`, fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

async function exportBlobApi(docId, format) {
  const res = await api.get(`/documents/${docId}/export?format=${format}`, { responseType: "blob" });
  return res.data;
}

async function downloadOriginalApi(docId) {
  const res = await api.get(`/documents/${docId}/download`, { responseType: "blob" });
  return res.data;
}

// —— Public API ——

export function isSupabaseDocumentsEnabled() {
  return isSupabaseAuthMode && !isMockApiMode;
}

export async function listDocuments(params) {
  if (isSupabaseDocumentsEnabled()) return listDocumentsSupabase(params);
  return listDocumentsApi(params);
}

export async function getDocument(id) {
  if (isSupabaseDocumentsEnabled()) return getDocumentSupabase(id);
  return getDocumentApi(id);
}

export async function createDocument(body, userId) {
  if (isSupabaseDocumentsEnabled()) return createDocumentSupabase(body, userId);
  return createDocumentApi(body);
}

export async function updateDocument(id, patch, userId) {
  if (isSupabaseDocumentsEnabled()) return updateDocumentSupabase(id, patch, userId);
  return updateDocumentApi(id, patch);
}

export async function deleteDocument(id) {
  if (isSupabaseDocumentsEnabled()) return deleteDocumentSupabase(id);
  return deleteDocumentApi(id);
}

export async function uploadDocumentFile(docId, file, userId, contentHtml) {
  if (isSupabaseDocumentsEnabled()) return uploadFileSupabase(docId, file, userId, contentHtml);
  return uploadFileApi(docId, file);
}

/** Guarda ArrayBuffer .docx no Storage (editor nativo docx-editor). */
export async function uploadDocxBuffer(docId, arrayBuffer, fileName, userId, contentHtml) {
  const name = fileName?.endsWith(".docx") ? fileName : `${(fileName || "documento").replace(/\.[^.]+$/, "")}.docx`;
  const file = new File([arrayBuffer], name, {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
  return uploadDocumentFile(docId, file, userId, contentHtml);
}

export async function downloadOriginalFile(doc) {
  if (isSupabaseDocumentsEnabled()) {
    const url = await signedDownloadUrlSupabase(doc);
    if (!url) throw new Error("Sem arquivo");
    const res = await fetch(url);
    return res.blob();
  }
  return downloadOriginalApi(doc.id);
}

export async function exportDocumentBlob(docId, format) {
  if (isSupabaseDocumentsEnabled()) {
    const { exportDocumentPdf, exportDocumentDocx } = await import("@/lib/documentExport");
    const doc = await getDocumentSupabase(docId);
    if (format === "pdf") return exportDocumentPdf(doc);
    return exportDocumentDocx(doc);
  }
  return exportBlobApi(docId, format);
}

export async function toggleDocumentPin(id, pinned, userId) {
  if (isSupabaseDocumentsEnabled()) return togglePinSupabase(id, pinned, userId);
  const { data } = await api.put(`/documents/${id}`, { pinned });
  return data;
}

export async function duplicateDocument(id, body) {
  if (isSupabaseDocumentsEnabled()) {
    const src = await getDocumentSupabase(id);
    return createDocumentSupabase({
      tenant_id: src.tenant_id,
      requirement: src.requirement,
      folder_key: src.folder_key,
      section: src.section,
      title: body.title || `${src.title} (cópia)`,
      code: body.code ?? src.code,
      version: body.version ?? src.version,
      responsible: body.responsible ?? src.responsible,
      review_date: body.review_date ?? src.review_date,
      content_html: body.content_html ?? src.content_html,
      status: "vigente",
    }, null);
  }
  const { data } = await api.post(`/documents/${id}/duplicate`, body);
  return data;
}

/** KPIs dashboard a partir de tenant_documents */
export async function fetchDocumentStatsSupabase(tenantId) {
  const { data, error } = await supabase
    .from("tenant_documents")
    .select("id, requirement, section, status, title, version, responsible, updated_at, created_at, pinned_at")
    .eq("tenant_id", tenantId);
  if (error) throw error;
  return data || [];
}
