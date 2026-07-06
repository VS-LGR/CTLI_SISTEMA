import { COLETA_LIST_PATH } from "@/lib/coletaRoutes";
import { CERTIFICATE_PENDING_APPROVAL_PATH } from "@/lib/certificateRoutes";

/** Cargos com acesso operacional completo no ambiente portal cliente. */
export const CLIENT_PORTAL_OPERATIONS_ROLES = [
  "tecnico_campo",
  "signatario",
  "diretor",
  "gerente_qualidade",
  "gerente_tecnico",
];

export function isClientPortalOperationsRole(role) {
  return CLIENT_PORTAL_OPERATIONS_ROLES.includes(role);
}

export function isClientPortalTenantModel(tenant) {
  return tenant?.deployment_model === "client_portal";
}

/** Nav restrita — técnico de campo (portal e full) ou signatário (só full). */
export function usesRestrictedNav(role, tenant = null) {
  if (role === "tecnico_campo") return true;
  if (isClientPortalTenantModel(tenant)) return false;
  return role === "signatario";
}

export function isTechnicianOnlyNav(role, tenant = null) {
  return role === "tecnico_campo";
}

export function isSignatoryOnlyNav(role, tenant = null) {
  if (isClientPortalTenantModel(tenant)) return false;
  return role === "signatario";
}

export function restrictedNavHomePath(role, tenant = null) {
  if (!usesRestrictedNav(role, tenant)) return "/dashboard";
  if (role === "tecnico_campo") return COLETA_LIST_PATH;
  return CERTIFICATE_PENDING_APPROVAL_PATH;
}

/** Cadastros de campo para técnico em ambiente full (CTLI/interno). */
export const TECNICO_FIELD_CADASTRO_SECTIONS = new Set([
  "pesos",
  "balancas",
  "cert-peso",
]);
