/** Rotas da coleta RE-7.2A dentro de PR-7.2 Calibração de Balanças */

export const COLETA_REQ_ID = "7";
export const COLETA_FOLDER_KEY = "pr-7-2";

export const COLETA_LIST_PATH = `/requirement/${COLETA_REQ_ID}/${COLETA_FOLDER_KEY}/coleta`;
export const COLETA_NEW_PATH = `${COLETA_LIST_PATH}/nova`;

export function coletaEditorPath(id) {
  return `${COLETA_LIST_PATH}/${id}`;
}

export function isColetaPath(pathname) {
  return pathname.startsWith(COLETA_LIST_PATH);
}
