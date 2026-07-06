export const MASTER_DOCUMENT_REQ_ID = "8";
export const MASTER_DOCUMENT_FOLDER_KEY = "pr-8-3";
export const MASTER_DOCUMENT_DEFAULT_TAB = "lista_mestra_internos";

export const LISTA_MESTRA_PATH = `/requirement/${MASTER_DOCUMENT_REQ_ID}/${MASTER_DOCUMENT_FOLDER_KEY}?tab=${MASTER_DOCUMENT_DEFAULT_TAB}`;
export const LISTA_MESTRA_SHORT_PATH = "/lista-mestra";
export const RE_72A_CONFIG_PATH = `/requirement/${MASTER_DOCUMENT_REQ_ID}/${MASTER_DOCUMENT_FOLDER_KEY}/config/re-72a`;
export const RE_71A_CONFIG_PATH = `/requirement/${MASTER_DOCUMENT_REQ_ID}/${MASTER_DOCUMENT_FOLDER_KEY}/config/re-71a`;
export function masterDocumentDetailPath(id) {
  return `/lista-mestra/${id}`;
}

export function masterDocumentListPath(tab = MASTER_DOCUMENT_DEFAULT_TAB) {
  return `/requirement/${MASTER_DOCUMENT_REQ_ID}/${MASTER_DOCUMENT_FOLDER_KEY}?tab=${tab}`;
}

export function inferProcedureCodeFromFolder(folderKey) {
  if (!folderKey || !folderKey.startsWith("pr-")) return null;
  const parts = folderKey.slice(3).split("-");
  return `PR-${parts.join(".")}`;
}

export function isMasterDocumentFolder(requirementId, folderKey) {
  return String(requirementId) === MASTER_DOCUMENT_REQ_ID && folderKey === MASTER_DOCUMENT_FOLDER_KEY;
}
