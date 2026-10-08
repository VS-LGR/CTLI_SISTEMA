/** Rotas da coleta RE-5.4.2A na pasta PR-7.2 Calibração de Pesos. */

export const WEIGHT_COLETA_REQ_ID = "7";
export const WEIGHT_COLETA_FOLDER_KEY = "pr-7-2-pesos";
export const WEIGHT_COLETA_LEGACY_LIST_PATH = "/requirement/7/pr-7-2/pesos/coleta";

export const WEIGHT_COLETA_LIST_PATH = `/requirement/${WEIGHT_COLETA_REQ_ID}/${WEIGHT_COLETA_FOLDER_KEY}/coleta`;
export const WEIGHT_COLETA_NEW_PATH = `${WEIGHT_COLETA_LIST_PATH}/nova`;

export function weightColetaEditorPath(id) {
  return `${WEIGHT_COLETA_LIST_PATH}/${id}`;
}

export function isWeightColetaPath(pathname) {
  return pathname.startsWith(WEIGHT_COLETA_LIST_PATH);
}
