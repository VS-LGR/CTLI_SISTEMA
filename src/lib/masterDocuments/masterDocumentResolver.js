import { supabase } from "@/lib/supabaseClient";
import { isSupabaseAuthMode } from "@/lib/api";
import {
  getLegacyFallbackByCode,
  getLegacyFallbackByTemplateKey,
  mergeDocumentMeta,
  resolveFromRecord,
  warnFallbackUsage,
} from "./masterDocumentFallback";
import { OBSOLETE_STATUSES } from "./masterDocumentConstants";

const cache = new Map();
const CACHE_TTL_MS = 60_000;

function cacheKey(tenantId, type, key) {
  return `${tenantId}:${type}:${key}`;
}

function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key, data) {
  cache.set(key, { data, ts: Date.now() });
}

export function clearMasterDocumentCache(tenantId) {
  if (!tenantId) {
    cache.clear();
    return;
  }
  for (const k of cache.keys()) {
    if (k.startsWith(`${tenantId}:`)) cache.delete(k);
  }
}

function mapToHeader(doc) {
  if (!doc) return null;
  return {
    id: doc.id,
    title: doc.title,
    code: doc.code,
    reference: doc.reference,
    revision: doc.current_revision,
    modelIssueDate: doc.current_issue_date,
    templateKey: doc.template_key,
    exportFileNamePattern: doc.export_file_name_pattern,
    fileNamingRule: doc.file_naming_rule,
    linkedModule: doc.linked_module,
    isObsolete: doc.is_obsolete || OBSOLETE_STATUSES.has(doc.status),
    status: doc.status,
    current_issue_date: doc.current_issue_date,
    current_revision: doc.current_revision,
    current_revision_date: doc.current_revision_date,
    export_file_name_pattern: doc.export_file_name_pattern,
    file_naming_rule: doc.file_naming_rule,
    template_key: doc.template_key,
    exportTemplateConfig: doc.export_template_config || {},
    certificateObservations: (doc.export_template_config || {}).certificateObservations || null,
  };
}

export async function getActiveDocumentByCode(tenantId, code) {
  if (!tenantId || !code || !isSupabaseAuthMode) return null;
  const key = cacheKey(tenantId, "code", code);
  const cached = getCached(key);
  if (cached) return cached;

  const { data, error } = await supabase
    .from("master_documents")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("code", code)
    .not("status", "in", '("cancelado")')
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  const mapped = mapToHeader(data);
  if (mapped) setCache(key, mapped);
  return mapped;
}

export async function getActiveDocumentByTemplateKey(tenantId, templateKey) {
  if (!tenantId || !templateKey || !isSupabaseAuthMode) return null;
  const key = cacheKey(tenantId, "template", templateKey);
  const cached = getCached(key);
  if (cached) return cached;

  const { data: link } = await supabase
    .from("document_template_links")
    .select("master_document_id")
    .eq("tenant_id", tenantId)
    .eq("template_key", templateKey)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  let doc = null;
  if (link?.master_document_id) {
    const { data, error } = await supabase
      .from("master_documents")
      .select("*")
      .eq("id", link.master_document_id)
      .maybeSingle();
    if (error) throw error;
    doc = data;
  }

  if (!doc) {
    const { data, error } = await supabase
      .from("master_documents")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("template_key", templateKey)
      .not("status", "in", '("cancelado")')
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    doc = data;
  }

  const mapped = mapToHeader(doc);
  if (mapped) setCache(key, mapped);
  return mapped;
}

export async function resolveDocumentForExport({
  tenantId,
  templateKey,
  code,
  record,
  defaultTitle,
}) {
  const recordMeta = resolveFromRecord(record, defaultTitle);
  let masterDoc = null;

  try {
    if (templateKey) masterDoc = await getActiveDocumentByTemplateKey(tenantId, templateKey);
    if (!masterDoc && (code || recordMeta?.code)) {
      masterDoc = await getActiveDocumentByCode(tenantId, code || recordMeta.code);
    }
  } catch (e) {
    console.warn("Falha ao buscar Lista Mestra:", e.message);
  }

  let fallback = null;
  if (!masterDoc) {
    fallback = templateKey
      ? getLegacyFallbackByTemplateKey(templateKey)
      : getLegacyFallbackByCode(code || recordMeta?.code);
    if (fallback) warnFallbackUsage(templateKey || code || recordMeta?.code, templateKey ? "templateKey" : "code");
  }

  const meta = mergeDocumentMeta(masterDoc, recordMeta, fallback);
  if (meta?.isObsolete && !record) {
    console.warn(`Documento ${meta.code} está obsoleto na Lista Mestra.`);
  }
  return meta;
}

export function calculateNextCriticalAnalysisDate(lastDate, periodMonths = 24) {
  if (!lastDate) return null;
  const d = new Date(lastDate);
  if (Number.isNaN(d.getTime())) return null;
  d.setMonth(d.getMonth() + periodMonths);
  return d.toISOString().slice(0, 10);
}

export function calculateNextExternalConsultationDate(lastDate, periodMonths = 6) {
  return calculateNextCriticalAnalysisDate(lastDate, periodMonths);
}
