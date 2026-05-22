/**
 * Documentos — Supabase (produção) ou API mock/legada.
 */

import api, { asArray, isMockApiMode, isSupabaseAuthMode } from "@/lib/api";
import { supabase } from "@/lib/supabaseClient";

export const TENANT_DOCUMENTS_BUCKET = "tenant-documents";

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
  const row = {
    tenant_id: body.tenant_id,
    requirement: String(body.requirement),
    folder_key: body.folder_key || null,
    section: body.section,
    title: body.title?.trim() || "",
    code: body.code || "",
    version: body.version || "1.0",
    responsible: body.responsible || "",
    review_date: body.review_date || null,
    content_html: body.content_html || "",
    status: body.status || "vigente",
    has_file: false,
    created_by: userId || null,
    updated_by: userId || null,
  };
  const { data, error } = await supabase.from("tenant_documents").insert(row).select("*").single();
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
