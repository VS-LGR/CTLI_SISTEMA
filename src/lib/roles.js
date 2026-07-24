// Cargos / Níveis do sistema (valores alinhados ao CHECK em `profiles` no Supabase)
import {
  CLIENT_PORTAL_OPERATIONS_ROLES,
  isTechnicianOnlyNav,
  isSignatoryOnlyNav,
  isDirectorOnlyNav,
  isClientPortalOperationsRole,
} from "@/lib/roleNav";

export {
  CLIENT_PORTAL_OPERATIONS_ROLES,
  isTechnicianOnlyNav,
  isSignatoryOnlyNav,
  isDirectorOnlyNav,
  isClientPortalOperationsRole,
};

export const ROLES = [
  { value: "admin", label: "Administrador CTLI", short: "CTLI" },
  { value: "client", label: "Conta cliente (portal)", short: "Cliente" },
  { value: "gerente_geral", label: "Gerente geral", short: "Gerente Geral" },
  { value: "tecnico_campo", label: "Técnico de campo", short: "Técnico" },
  { value: "signatario", label: "Signatário", short: "Signatário" },
  { value: "diretor", label: "Diretor", short: "Diretor" },
  { value: "gerente_qualidade", label: "Gerente da Qualidade", short: "Gerente Qualidade" },
  { value: "gerente_tecnico", label: "Gerente Técnico", short: "Gerente Técnico" },
  { value: "administrativo_vendas", label: "Administrativo / Vendas", short: "Adm/Vendas" },
  { value: "administrativo_compras", label: "Administrativo / Compras", short: "Adm/Compras" },
];

/** Papéis que podem receber toggles de coleta/certificados na criação/edição. */
export const ROLES_WITH_ACCESS_TOGGLES = [
  "gerente_qualidade",
  "gerente_tecnico",
  "administrativo_vendas",
];

export const roleAllowsAccessToggles = (role) => ROLES_WITH_ACCESS_TOGGLES.includes(role);

// Responsáveis documentais (lista mestra) — não inclui login signatário nem CTLI/cliente/técnico
export const RESPONSIBLE_ROLES = ROLES.filter(
  (r) => !["admin", "client", "tecnico_campo", "signatario"].includes(r.value),
);

export const isCtliAdmin = (role) => role === "admin";

export const isFieldTechnicianRole = (role) => role === "tecnico_campo";

export const isSignatoryRole = (role) => role === "signatario";

export const isDirectorRole = (role) => role === "diretor";

export const isGerenteGeralRole = (role) => role === "gerente_geral";

function flagTrue(user, key) {
  return Boolean(user?.[key]);
}

/** Coleta / OS — papel base ou toggle. */
export const canAccessColeta = (role, user = null) => {
  if (isCtliAdmin(role) || role === "client" || isGerenteGeralRole(role) || isFieldTechnicianRole(role)) {
    return true;
  }
  if (isSignatoryRole(role) || isDirectorRole(role) || role === "administrativo_compras") {
    return false;
  }
  if (roleAllowsAccessToggles(role)) return flagTrue(user, "access_coleta");
  return false;
};

/** Painel / lista de certificados (inclui aprovação). */
export const canAccessCalibrationCertificates = (role, user = null) => {
  if (isFieldTechnicianRole(role) || isDirectorRole(role) || role === "administrativo_compras") {
    return false;
  }
  if (isCtliAdmin(role) || role === "client" || isGerenteGeralRole(role) || isSignatoryRole(role)) {
    return true;
  }
  if (roleAllowsAccessToggles(role)) return flagTrue(user, "access_certificados");
  return false;
};

/** Papéis que podem aprovar certificados (signatário interno). */
export const canApproveCalibrationCertificate = (role) =>
  ["admin", "client", "gerente_geral", "signatario"].includes(role);

/** Papéis que podem emitir certificado oficial. */
export const canEmitCalibrationCertificate = (role, user = null) => {
  if (isSignatoryRole(role) || isDirectorRole(role) || isFieldTechnicianRole(role)) return false;
  if (isCtliAdmin(role) || role === "client" || isGerenteGeralRole(role)) return true;
  if (roleAllowsAccessToggles(role)) return flagTrue(user, "access_certificados");
  return false;
};

/** Papéis que podem enviar certificado por e-mail ao cliente. */
export const canSendCertificateEmail = (role, user = null) =>
  canAccessCalibrationCertificates(role, user) && !isDirectorRole(role);

/** Edição / criação técnica de certificados — exclui signatário, técnico e diretor. */
export const canEditCalibrationCertificate = (role, user = null) => {
  if (isSignatoryRole(role) || isFieldTechnicianRole(role) || isDirectorRole(role)) return false;
  if (isCtliAdmin(role) || role === "client" || isGerenteGeralRole(role)) return true;
  if (roleAllowsAccessToggles(role)) return flagTrue(user, "access_certificados");
  return false;
};

/** Pedidos de compra / orçamentos (PR-6.6). */
export const canAccessPurchaseOrders = (role) =>
  [
    "admin",
    "client",
    "gerente_geral",
    "gerente_qualidade",
    "administrativo_compras",
  ].includes(role);

/** Solicitações de orçamento — mesmos papéis que pedidos de compra. */
export const canAccessQuotationRequests = canAccessPurchaseOrders;

/** Propostas comerciais RE-7.1A. */
export const canAccessCommercialProposals = (role) =>
  [
    "admin",
    "client",
    "gerente_geral",
    "gerente_tecnico",
    "administrativo_vendas",
  ].includes(role);

/** Módulo 6.2 Pessoal. */
export const canAccessPersonnel = (role) =>
  [
    "admin",
    "client",
    "gerente_geral",
    "gerente_qualidade",
    "gerente_tecnico",
  ].includes(role);

/** Edição de listas padrão do módulo Pessoal. */
export const canEditPersonnelStandardOptions = (role) =>
  ["admin", "client", "gerente_geral", "gerente_qualidade", "gerente_tecnico"].includes(role);

/** Lista Mestra de Documentos (PR-8.3). */
export const canAccessMasterDocuments = (role) =>
  [
    "admin",
    "client",
    "gerente_geral",
    "gerente_qualidade",
  ].includes(role);

export const canManageTechnicians = (role) =>
  role === "admin" || role === "client" || role === "gerente_geral";

/** Admin do ambiente (portal cliente) — gestão de usuários do tenant. */
export const canManageTenantUsers = (role) =>
  role === "admin" || role === "client";

/** Lembretes na dashboard: admin CTLI, conta cliente e signatário (notificações). */
export const canManageDashboardReminders = (role) =>
  role === "admin" || role === "client" || role === "signatario";

/** Cadastros (menu) — papéis com acesso a secções de cadastro. */
export const canAccessCadastrosMenu = (role) =>
  [
    "admin",
    "gerente_geral",
    "gerente_qualidade",
    "gerente_tecnico",
    "administrativo_vendas",
    "administrativo_compras",
  ].includes(role);

export const roleLabel = (value) => ROLES.find((r) => r.value === value)?.label || value || "—";
export const roleShort = (value) => ROLES.find((r) => r.value === value)?.short || value || "—";
