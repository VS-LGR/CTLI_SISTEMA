import { listMasterDocuments } from "./masterDocumentsApi";
import { inferProcedureCodeFromFolder } from "./masterDocumentRoutes";
import { isSupabaseAuthMode } from "@/lib/api";
import {
  mapFolderLabelsFromDocuments,
  resolveCodeForFolderFromDocuments,
} from "./procedureLabelUtils";

export {
  mapFolderLabelsFromDocuments,
  resolveCodeForFolderFromDocuments,
} from "./procedureLabelUtils";

const cache = new Map();
const CACHE_TTL_MS = 60_000;

/**
 * Resolve código/título de procedimento a partir da Lista Mestra do tenant,
 * usando folder_key estável (ex.: pr-6-2) via system_folder_key.
 */
export async function resolveProcedureLabelForFolder(tenantId, folderKey, fallbackLabel = "") {
  if (!folderKey) return fallbackLabel || "";
  const inferred = inferProcedureCodeFromFolder(folderKey);
  if (!tenantId || !isSupabaseAuthMode) {
    return fallbackLabel || inferred || folderKey;
  }

  const cacheKey = `${tenantId}:${folderKey}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return cached.label;
  }

  try {
    const docs = await listMasterDocuments(tenantId, { type: "procedimento" });
    let doc = docs.find((d) => d.system_folder_key === folderKey && d.status !== "cancelado");
    if (!doc) {
      doc = docs.find((d) => d.code === inferred && d.status !== "cancelado");
    }
    if (!doc) {
      const titleHint = String(fallbackLabel || "")
        .replace(/^PR-[\d.A-Z]+\s*/i, "")
        .trim()
        .toLowerCase();
      if (titleHint) {
        doc = docs.find((d) => (d.title || "").toLowerCase().includes(titleHint) && d.status !== "cancelado");
      }
    }

    const label = doc
      ? `${doc.code}${doc.title ? ` ${doc.title}` : ""}`.trim()
      : (fallbackLabel || inferred || folderKey);

    cache.set(cacheKey, { label, code: doc?.code || inferred, ts: Date.now() });
    return label;
  } catch {
    return fallbackLabel || inferred || folderKey;
  }
}

export async function buildProcedureLabelMap(tenantId, folderEntries = []) {
  const map = {};
  if (!tenantId || !folderEntries.length) return map;

  let docs = [];
  try {
    docs = await listMasterDocuments(tenantId, {});
  } catch {
    docs = [];
  }

  return mapFolderLabelsFromDocuments(docs, folderEntries);
}

export function clearProcedureLabelCache(tenantId) {
  if (!tenantId) {
    cache.clear();
    return;
  }
  for (const k of cache.keys()) {
    if (k.startsWith(`${tenantId}:`)) cache.delete(k);
  }
}
