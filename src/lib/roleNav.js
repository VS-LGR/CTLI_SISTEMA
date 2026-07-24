import { COLETA_LIST_PATH } from "@/lib/coletaRoutes";
import { CERTIFICATE_PENDING_APPROVAL_PATH } from "@/lib/certificateRoutes";

/** Cargos com acesso operacional amplo no ambiente (legado / referência). */
export const CLIENT_PORTAL_OPERATIONS_ROLES = [
  "tecnico_campo",
  "signatario",
  "diretor",
  "gerente_qualidade",
  "gerente_tecnico",
  "gerente_geral",
  "administrativo_vendas",
  "administrativo_compras",
];

export function isClientPortalOperationsRole(role) {
  return CLIENT_PORTAL_OPERATIONS_ROLES.includes(role);
}

export function isClientPortalTenantModel(tenant) {
  return tenant?.deployment_model === "client_portal";
}

/** Nav restrita — técnico, signatário ou diretor. */
export function usesRestrictedNav(role) {
  return role === "tecnico_campo" || role === "signatario" || role === "diretor";
}

export function isTechnicianOnlyNav(role) {
  return role === "tecnico_campo";
}

export function isSignatoryOnlyNav(role) {
  return role === "signatario";
}

export function isDirectorOnlyNav(role) {
  return role === "diretor";
}

export function restrictedNavHomePath(role) {
  if (role === "tecnico_campo") return COLETA_LIST_PATH;
  if (role === "signatario") return CERTIFICATE_PENDING_APPROVAL_PATH;
  if (role === "diretor") return "/dashboard";
  return "/dashboard";
}

/**
 * Menu enxuto do portal — apenas conta `client` (dono do ambiente).
 * Outros papéis usam a árvore de requisitos filtrada pela matriz RBAC.
 */
export function usesClientSidebarNav(role, _tenant = null, _user = null) {
  return role === "client";
}

/** Cadastros de campo para técnico em ambiente full (CTLI/interno) — referência. */
export const TECNICO_FIELD_CADASTRO_SECTIONS = new Set([
  "pesos",
  "balancas",
  "cert-peso",
]);
