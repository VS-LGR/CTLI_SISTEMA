import { canAccessPersonnel } from "@/lib/roles";

export const PERSONNEL_SECTIONS = [
  { id: "cargos", label: "Cargos / Funções" },
  { id: "adequacao", label: "Adequação de Competência" },
  { id: "monitoramento", label: "Monitoramento de Pessoal" },
  { id: "listas", label: "Níveis e Listas Padrão" },
];

export function personnelSectionPath(id) {
  return `/pessoal/${id}`;
}

export function getPersonnelSectionLabel(id) {
  return PERSONNEL_SECTIONS.find((s) => s.id === id)?.label || "6.2 Pessoal";
}

export function getVisiblePersonnelSections(role) {
  if (!canAccessPersonnel(role)) return [];
  return PERSONNEL_SECTIONS;
}

export function isValidPersonnelSection(id) {
  return PERSONNEL_SECTIONS.some((s) => s.id === id);
}
