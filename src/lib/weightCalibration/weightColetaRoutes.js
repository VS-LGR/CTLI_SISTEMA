/** Rotas da coleta RE-5.4.2A (pesos-padrão) dentro de PR-7.2 */

export const WEIGHT_COLETA_REQ_ID = "7";
export const WEIGHT_COLETA_FOLDER_KEY = "pr-7-2";

export const WEIGHT_COLETA_LIST_PATH = `/requirement/${WEIGHT_COLETA_REQ_ID}/${WEIGHT_COLETA_FOLDER_KEY}/pesos/coleta`;
export const WEIGHT_COLETA_NEW_PATH = `${WEIGHT_COLETA_LIST_PATH}/nova`;

export function weightColetaEditorPath(id) {
  return `${WEIGHT_COLETA_LIST_PATH}/${id}`;
}

export function isWeightColetaPath(pathname) {
  return pathname.startsWith(WEIGHT_COLETA_LIST_PATH);
}
