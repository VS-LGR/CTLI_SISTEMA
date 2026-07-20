/** Dashboard e registros do módulo 6.2 Pessoal (PR-6.2) */

import { PERSONNEL_REGISTRO_TOPICS } from "@/lib/personnelRegistrosConfig";

export const PERSONNEL_REQ_ID = "6";
export const PERSONNEL_FOLDER_KEY = "pr-6-2";

export const PERSONNEL_DASHBOARD_PATH = `/requirement/${PERSONNEL_REQ_ID}/${PERSONNEL_FOLDER_KEY}`;

/** Aba de pasta (documentFolderConfig) ↔ tópico de registro (personnelRegistrosConfig). */
export const PERSONNEL_SECTION_TO_TOPIC = {
  registro_6_2a: "re-62a",
  registro_6_2b: "re-62b",
  registro_6_2c: "re-62c",
  registro_6_2d: "re-62d",
  registro_6_2e: "re-62e",
  registro_6_2f: "re-62f",
};

export const PERSONNEL_TOPIC_TO_SECTION = Object.fromEntries(
  Object.entries(PERSONNEL_SECTION_TO_TOPIC).map(([section, topic]) => [topic, section]),
);

export const PERSONNEL_DEFAULT_REGISTRO_SECTION = "registro_6_2a";

export const PERSONNEL_REGISTROS_PATH = `${PERSONNEL_DASHBOARD_PATH}?tab=${PERSONNEL_DEFAULT_REGISTRO_SECTION}`;
export const PERSONNEL_PROCEDIMENTOS_PATH = `${PERSONNEL_DASHBOARD_PATH}?tab=procedimento`;

const TOPIC_ALIASES = { "pr-62f": "re-62f" };
const VALID_TOPIC_IDS = new Set(PERSONNEL_REGISTRO_TOPICS.map((t) => t.id));

/** @param {string | null | undefined} topicParam */
export function parsePersonnelTopicsParam(topicParam) {
  if (!topicParam) return [];
  return topicParam
    .split(",")
    .map((s) => TOPIC_ALIASES[s.trim()] || s.trim())
    .filter((id) => VALID_TOPIC_IDS.has(id));
}

/** @param {string[]} topics */
export function formatPersonnelTopicsParam(topics) {
  if (!topics?.length) return null;
  return topics.join(",");
}

export function personnelTopicToFolderSection(topicId) {
  return PERSONNEL_TOPIC_TO_SECTION[topicId] || PERSONNEL_DEFAULT_REGISTRO_SECTION;
}

export function personnelFolderSectionToTopic(sectionId) {
  return PERSONNEL_SECTION_TO_TOPIC[sectionId] || null;
}

export function isPersonnelRegistroFolderSection(sectionId) {
  return Boolean(PERSONNEL_SECTION_TO_TOPIC[sectionId]);
}

export function personnelRegistrosPath({ topic, topics } = {}) {
  const list = topics?.length
    ? topics
    : (topic && topic !== "all" ? [topic] : []);
  if (!list.length) return PERSONNEL_REGISTROS_PATH;
  const section = personnelTopicToFolderSection(list[0]);
  return `${PERSONNEL_DASHBOARD_PATH}?tab=${section}`;
}

/** Mapeamento de rotas legadas /pessoal/:section → tópico de filtro */
export const PERSONNEL_LEGACY_SECTION_TOPIC = {
  cargos: "re-62c",
  adequacao: "re-62a",
  monitoramento: "re-62e",
  "avaliacao-experiencia": "re-62b",
  selecao: "re-62f",
  presenca: "re-62d",
};

export function isPersonnelDashboardPath(pathname) {
  return pathname === PERSONNEL_DASHBOARD_PATH
    || pathname.startsWith(`${PERSONNEL_DASHBOARD_PATH}/`);
}
