/** Pastas exclusivas CTLI — hard-block para qualquer role ≠ admin. */
export const CTLI_ONLY_FOLDER_KEYS = new Set([
  "pr-4-1",
  "pr-6-4-10",
  "pr-6-5",
  "pr-7-1-7",
  "pr-7-10",
  "pr-7-11",
  "pr-7-2-2",
  "pr-7-4",
  "pr-7-7",
  "pr-7-8",
  "pr-7-9",
  "pr-8-4",
  "pr-8-5",
  "pr-8-6-2",
  "pr-8-7",
  "pr-8-8",
  "pr-8-9",
]);

/** No requisito 7, contas não-CTLI só veem estas pastas. */
export const NON_CTLI_REQ7_FOLDER_KEYS = new Set(["pr-7-1", "pr-7-2", "pr-7-6"]);

export function isCtliOnlyRequirement(requirementId) {
  return String(requirementId) === "4";
}

export function isFolderAllowedForNonCtli(requirementId, folderKey) {
  const rid = String(requirementId);
  const fk = String(folderKey || "");
  if (!fk) return false;
  if (isCtliOnlyRequirement(rid)) return false;
  if (CTLI_ONLY_FOLDER_KEYS.has(fk)) return false;
  if (rid === "7" && !NON_CTLI_REQ7_FOLDER_KEYS.has(fk)) return false;
  return true;
}

/** Filtra listas de pastas ACL removendo chaves CTLI-only. */
export function filterFoldersForNonCtli(folders = {}) {
  const out = {};
  Object.entries(folders || {}).forEach(([reqId, keys]) => {
    if (isCtliOnlyRequirement(reqId)) return;
    const list = (Array.isArray(keys) ? keys : [])
      .filter((fk) => isFolderAllowedForNonCtli(reqId, fk));
    if (list.length) out[String(reqId)] = list;
  });
  return out;
}
