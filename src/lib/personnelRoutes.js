export const PERSONNEL_BASE_PATH = "/pessoal";
export const PERSONNEL_CARGOS_PATH = "/pessoal/cargos";
export const PERSONNEL_ADEQUACAO_PATH = "/pessoal/adequacao";
export const PERSONNEL_MONITORAMENTO_PATH = "/pessoal/monitoramento";
export const PERSONNEL_LISTAS_PATH = "/pessoal/listas";

export function positionEditorPath(id) {
  return `/pessoal/cargos/${id}`;
}

export function adequacyEditorPath(id) {
  return `/pessoal/adequacao/${id}`;
}

export function monitoringEditorPath(id) {
  return `/pessoal/monitoramento/${id}`;
}

export function isPersonnelPath(pathname) {
  return pathname.startsWith(PERSONNEL_BASE_PATH);
}
