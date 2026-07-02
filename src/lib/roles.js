// Cargos / Níveis do sistema (valores alinhados ao CHECK em `profiles` no Supabase)
import {
  CLIENT_PORTAL_OPERATIONS_ROLES,
  isTechnicianOnlyNav,
  isSignatoryOnlyNav,
  isClientPortalOperationsRole,
} from "@/lib/roleNav";

export { CLIENT_PORTAL_OPERATIONS_ROLES, isTechnicianOnlyNav, isSignatoryOnlyNav, isClientPortalOperationsRole };

export const ROLES = [
  { value: "admin", label: "Administrador CTLI", short: "CTLI" },
  { value: "client", label: "Conta cliente (portal)", short: "Cliente" },
  { value: "tecnico_campo", label: "Técnico de campo", short: "Técnico" },
  { value: "signatario", label: "Signatário", short: "Signatário" },
  { value: "diretor", label: "Diretor", short: "Diretor" },
  { value: "gerente_qualidade", label: "Gerente da Qualidade", short: "Gerente Qualidade" },
  { value: "gerente_tecnico", label: "Gerente Técnico", short: "Gerente Técnico" },
  { value: "administrativo_vendas", label: "Administrativo / Vendas", short: "Adm/Vendas" },
];

// Responsáveis documentais (lista mestra) — não inclui login signatário nem CTLI/cliente/técnico
export const RESPONSIBLE_ROLES = ROLES.filter(
  (r) => !["admin", "client", "tecnico_campo", "signatario"].includes(r.value),
);

export const isCtliAdmin = (role) => role === "admin";

const OPERATIONS_AND_CLIENT = ["admin", "client", ...CLIENT_PORTAL_OPERATIONS_ROLES];

export const canAccessColeta = (role) => OPERATIONS_AND_CLIENT.includes(role);

const CERTIFICATE_INTERNAL_ROLES = [
  "admin",
  "client",
  "diretor",
  "gerente_qualidade",
  "gerente_tecnico",
  "signatario",
];

/** Papéis que podem aprovar certificados (signatário interno). */
export const canApproveCalibrationCertificate = (role) =>
  CERTIFICATE_INTERNAL_ROLES.includes(role);

/** Papéis que podem emitir certificado oficial. */
export const canEmitCalibrationCertificate = canApproveCalibrationCertificate;

/** Papéis que podem enviar certificado por e-mail ao cliente. */
export const canSendCertificateEmail = (role) =>
  [
    "admin",
    "client",
    "diretor",
    "gerente_qualidade",
    "gerente_tecnico",
    "administrativo_vendas",
    "signatario",
  ].includes(role);

/** Certificados RE-7.2B — coleta + papéis internos de calibração. */
export const canAccessCalibrationCertificates = (role) =>
  [
    "admin",
    "client",
    "tecnico_campo",
    ...CERTIFICATE_INTERNAL_ROLES,
    "administrativo_vendas",
  ].includes(role);

/** Edição técnica de certificados — exclui signatário e técnico de campo. */
export const canEditCalibrationCertificate = (role) =>
  [
    "admin",
    "client",
    "diretor",
    "gerente_qualidade",
    "gerente_tecnico",
  ].includes(role);

/** Pedidos de compra: admin, cliente, gerentes e administrativo/vendas. */
export const canAccessPurchaseOrders = (role) =>
  [
    "admin",
    "client",
    "diretor",
    "gerente_qualidade",
    "gerente_tecnico",
    "administrativo_vendas",
  ].includes(role);

/** Solicitações de orçamento — mesmos papéis que pedidos de compra. */
export const canAccessQuotationRequests = canAccessPurchaseOrders;

/** Propostas comerciais RE-7.1A — operações do portal + adm/vendas. */
export const canAccessCommercialProposals = (role) =>
  [...OPERATIONS_AND_CLIENT, "administrativo_vendas"].includes(role);

/** Módulo 6.2 Pessoal — operações do portal + adm/vendas. */
export const canAccessPersonnel = canAccessCommercialProposals;

/** Edição de listas padrão do módulo Pessoal. */
export const canEditPersonnelStandardOptions = (role) =>
  ["admin", "client", "gerente_qualidade", "gerente_tecnico", "diretor", "signatario"].includes(role);

/** Lista Mestra de Documentos (PR-8.3). */
export const canAccessMasterDocuments = (role) =>
  ["admin", "client", ...CLIENT_PORTAL_OPERATIONS_ROLES].includes(role);

export const canManageTechnicians = (role) =>
  role === "admin" || role === "client";

/** Admin do ambiente (portal cliente) — gestão de usuários do tenant. */
export const canManageTenantUsers = (role) =>
  role === "admin" || role === "client";

/** Lembretes na dashboard: admin CTLI, conta cliente e signatário (notificações). */
export const canManageDashboardReminders = (role) =>
  role === "admin" || role === "client" || role === "signatario";

export const roleLabel = (value) => ROLES.find((r) => r.value === value)?.label || value || "—";
export const roleShort = (value) => ROLES.find((r) => r.value === value)?.short || value || "—";
