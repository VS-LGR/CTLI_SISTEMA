import { canManageTechnicians, isCtliAdmin } from "@/lib/roles";
import { canAccessCadastroSection } from "@/lib/tenantAccess";

/** Secções de cadastro redistribuídas por pasta de requisito (PR). */

export const CADASTRO_SECTIONS = [
  { id: "fornecedores", label: "Fornecedores", reqId: "6", folderKey: "pr-6-6" },
  { id: "clientes", label: "Clientes", reqId: "7", folderKey: "pr-7-1" },
  { id: "colaboradores", label: "Colaboradores", reqId: "6", folderKey: "pr-6-2" },
  { id: "cert-peso", label: "Certificados de Calibração dos Equipamentos", reqId: "6", folderKey: "pr-6-4" },
  { id: "pesos", label: "Peso Padrão", reqId: "6", folderKey: "pr-6-4" },
  { id: "balancas", label: "Balanças", reqId: "7", folderKey: "pr-7-1" },
  { id: "thermo", label: "Termobarohigrômetro", reqId: "6", folderKey: "pr-6-4" },
  { id: "tecnicos", label: "Técnicos de campo", reqId: "6", folderKey: "pr-6-2", techniciansOnly: true },
];

const CADASTRO_PATH_RE = /^\/requirement\/(\d+)\/([^/]+)\/cadastro\/([^/]+)/;

export function cadastroSectionPath(id) {
  const section = CADASTRO_SECTIONS.find((s) => s.id === id);
  if (!section) return `/cadastros/${id}`;
  return `/requirement/${section.reqId}/${section.folderKey}/cadastro/${id}`;
}

export function getCadastroSectionLabel(id) {
  return CADASTRO_SECTIONS.find((s) => s.id === id)?.label || "Cadastro";
}

export function getCadastroSectionParent(id) {
  const section = CADASTRO_SECTIONS.find((s) => s.id === id);
  if (!section) return null;
  return { reqId: section.reqId, folderKey: section.folderKey };
}

export function getCadastroParentFromPath(pathname) {
  if (!pathname) return null;
  const m = pathname.match(CADASTRO_PATH_RE);
  if (!m) return null;
  return { reqId: m[1], folderKey: m[2], sectionId: m[3] };
}

export function isCadastroSectionPath(pathname) {
  return CADASTRO_PATH_RE.test(pathname || "");
}

export function getCadastroSectionsForFolder(reqId, folderKey, role, tenant = null, user = null) {
  return getVisibleCadastroSections(role, tenant, user).filter(
    (s) => String(s.reqId) === String(reqId) && s.folderKey === folderKey,
  );
}

export function getVisibleCadastroSections(role, tenant = null, user = null) {
  return CADASTRO_SECTIONS.filter((s) => {
    if (s.techniciansOnly && !canManageTechnicians(role)) return false;
    if (tenant && !canAccessCadastroSection({ tenant, role, sectionId: s.id, user })) return false;
    return true;
  });
}

/** Rótulo curto para mensagens de erro (ex.: "PR-7.1 → Clientes"). */
export function getCadastroSectionHint(id) {
  const section = CADASTRO_SECTIONS.find((s) => s.id === id);
  if (!section) return "cadastro correspondente";
  const prLabel = `PR-${section.folderKey.replace(/^pr-/, "").replace(/-/g, ".")}`;
  const shortLabel = section.label.split(" — ")[0];
  return `${prLabel} → ${shortLabel}`;
}
