import { inferProcedureCodeFromFolder } from "./masterDocumentRoutes";

/**
 * Mapa síncrono a partir de lista já carregada de master_documents.
 */
export function mapFolderLabelsFromDocuments(docs, folderEntries = []) {
  const active = (docs || []).filter((d) => d.status !== "cancelado");
  const procedures = active.filter((d) => d.type === "procedimento");
  const map = {};
  for (const entry of folderEntries) {
    const key = entry.folderKey;
    if (!key) continue;
    const inferred = inferProcedureCodeFromFolder(key);
    let doc = procedures.find((d) => d.system_folder_key === key);
    if (!doc) doc = procedures.find((d) => d.code === inferred);
    if (!doc) {
      const titleHint = String(entry.label || "")
        .replace(/^PR-[\d.A-Z]+\s*/i, "")
        .trim()
        .toLowerCase();
      if (titleHint) {
        doc = procedures.find((d) => (d.title || "").toLowerCase() === titleHint
          || (d.title || "").toLowerCase().includes(titleHint));
      }
    }
    map[key] = doc
      ? `${doc.code}${doc.title ? ` ${doc.title}` : ""}`.trim()
      : entry.label;
  }
  return map;
}

/** Código ativo (remapeado) para um folder_key, ou código inferido. */
export function resolveCodeForFolderFromDocuments(docs, folderKey) {
  const inferred = inferProcedureCodeFromFolder(folderKey);
  const procedures = (docs || []).filter((d) => d.type === "procedimento" && d.status !== "cancelado");
  const doc = procedures.find((d) => d.system_folder_key === folderKey)
    || procedures.find((d) => d.code === inferred);
  return doc?.code || inferred;
}
