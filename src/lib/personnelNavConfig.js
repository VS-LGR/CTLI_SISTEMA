import { canAccessPersonnel, canEditPersonnelStandardOptions } from "@/lib/roles";
import {
  PERSONNEL_DASHBOARD_PATH,
  PERSONNEL_REGISTROS_PATH,
  PERSONNEL_LEGACY_SECTION_TOPIC,
} from "@/lib/personnelRegistrosRoutes";
import { PERSONNEL_LISTAS_PATH } from "@/lib/personnelRoutes";

/** Itens do menu lateral 6.2 Pessoal */
export const PERSONNEL_NAV_ITEMS = [
  { id: "dashboard", label: "6.2 Pessoal", to: PERSONNEL_DASHBOARD_PATH },
  { id: "registros", label: "Registros", to: PERSONNEL_REGISTROS_PATH },
  { id: "listas", label: "Níveis e Listas Padrão", to: PERSONNEL_LISTAS_PATH, requiresStandardOptions: true },
];

export function getVisiblePersonnelNavItems(role) {
  if (!canAccessPersonnel(role)) return [];
  return PERSONNEL_NAV_ITEMS.filter(
    (item) => !item.requiresStandardOptions || canEditPersonnelStandardOptions(role),
  );
}

export function isPersonnelNavActive(pathnameAndSearch, item) {
  const pathOnly = pathnameAndSearch.split("?")[0];
  const hasRegistroTab = pathnameAndSearch.includes("tab=registro");

  if (item.id === "dashboard") {
    const onPr62 = pathOnly === PERSONNEL_DASHBOARD_PATH || pathOnly.startsWith("/requirement/6/pr-6-2");
    const onLegacyList = Object.keys(PERSONNEL_LEGACY_SECTION_TOPIC).some((s) => pathOnly === `/pessoal/${s}`);
    return onPr62 && !hasRegistroTab && !onLegacyList;
  }
  if (item.id === "registros") {
    return hasRegistroTab
      || Object.keys(PERSONNEL_LEGACY_SECTION_TOPIC).some((s) => pathOnly === `/pessoal/${s}`);
  }
  if (item.id === "listas") {
    return pathOnly === PERSONNEL_LISTAS_PATH || pathOnly.startsWith(`${PERSONNEL_LISTAS_PATH}/`);
  }
  return pathOnly === item.to || pathOnly.startsWith(`${item.to}/`);
}

/** Legado: mapeamento /pessoal/:section → tópico de filtro */
export { PERSONNEL_LEGACY_SECTION_TOPIC };

export function legacySectionToRegistrosPath(section) {
  const topic = PERSONNEL_LEGACY_SECTION_TOPIC[section];
  if (!topic) return PERSONNEL_REGISTROS_PATH;
  return `${PERSONNEL_REGISTROS_PATH}&topic=${encodeURIComponent(topic)}`;
}
