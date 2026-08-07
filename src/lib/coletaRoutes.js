/** Rotas da coleta RE-7.2A dentro de PR-7.2 Calibração de Balanças */

export const COLETA_REQ_ID = "7";
export const COLETA_FOLDER_KEY = "pr-7-2";

/** Hub: escolha entre coleta de balanças e coleta de pesos-padrão */
export const COLETA_HUB_PATH = `/requirement/${COLETA_REQ_ID}/${COLETA_FOLDER_KEY}/coleta`;

/** Lista / editor — calibração de balanças (RE-7.2A) */
export const COLETA_LIST_PATH = `${COLETA_HUB_PATH}/balancas`;
export const COLETA_NEW_PATH = `${COLETA_LIST_PATH}/nova`;

export function coletaEditorPath(id) {
  return `${COLETA_LIST_PATH}/${id}`;
}

export function isColetaHubPath(pathname) {
  return pathname === COLETA_HUB_PATH || pathname === `${COLETA_HUB_PATH}/`;
}

export function isColetaPath(pathname) {
  return pathname === COLETA_HUB_PATH
    || pathname.startsWith(`${COLETA_HUB_PATH}/`);
}

export function isColetaOnlyPath(pathname) {
  return isColetaPath(pathname);
}
