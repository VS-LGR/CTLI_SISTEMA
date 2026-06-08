/** Dashboard e registros do módulo 6.2 Pessoal (PR-6.2) */

export const PERSONNEL_REQ_ID = "6";
export const PERSONNEL_FOLDER_KEY = "pr-6-2";

export const PERSONNEL_DASHBOARD_PATH = `/requirement/${PERSONNEL_REQ_ID}/${PERSONNEL_FOLDER_KEY}`;
export const PERSONNEL_REGISTROS_PATH = `${PERSONNEL_DASHBOARD_PATH}?tab=registro`;

export function personnelRegistrosPath({ topic } = {}) {
  if (!topic || topic === "all") return PERSONNEL_REGISTROS_PATH;
  return `${PERSONNEL_REGISTROS_PATH}&topic=${encodeURIComponent(topic)}`;
}

/** Mapeamento de rotas legadas /pessoal/:section → tópico de filtro */
export const PERSONNEL_LEGACY_SECTION_TOPIC = {
  cargos: "re-62c",
  adequacao: "re-62a",
  monitoramento: "re-62e",
  "avaliacao-experiencia": "re-62b",
  selecao: "pr-62f",
  presenca: "re-62d",
};

export function isPersonnelDashboardPath(pathname) {
  return pathname === PERSONNEL_DASHBOARD_PATH
    || pathname.startsWith(`${PERSONNEL_DASHBOARD_PATH}/`);
}
