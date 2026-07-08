import {
  ROLES,
  isCtliAdmin,
  isFieldTechnicianRole,
  canAccessColeta,
  canAccessCalibrationCertificates,
  canAccessCommercialProposals,
  canAccessPersonnel,
  canAccessMasterDocuments,
  canAccessPurchaseOrders,
  canManageTechnicians,
  isClientPortalOperationsRole,
} from "@/lib/roles";
import {
  CLIENT_ENV_REQ_IDS,
  CLIENT_ENV_REQ5_FOLDERS,
  CLIENT_ENV_REQ7_FOLDERS,
  CLIENT_ENV_REQ8_FOLDERS,
  isClientEnvironmentUser,
} from "@/lib/clientNavConfig";

export const DEPLOYMENT_MODELS = {
  FULL: "full",
  CLIENT_PORTAL: "client_portal",
};

export const TENANT_ADMIN_CREATABLE_ROLES = [
  "tecnico_campo",
  "signatario",
  "administrativo_vendas",
  "gerente_qualidade",
  "gerente_tecnico",
  "diretor",
];

export const CLIENT_PORTAL_REQ_IDS = ["5", "6", "7", "8"];

export const CLIENT_PORTAL_REQ6_FOLDERS = new Set(["pr-6-2", "pr-6-4", "pr-6-4-12"]);

export const CLIENT_PORTAL_REQ7_FOLDERS = new Set(["pr-7-1", "pr-7-2"]);

export const CLIENT_PORTAL_REQ8_FOLDERS = new Set(["pr-8-3"]);

export const CLIENT_PORTAL_CADASTRO_SECTIONS = new Set([
  "colaboradores",
  "cert-peso",
  "pesos",
  "balancas",
  "thermo",
  "tecnicos",
  "clientes",
]);

export const CLIENT_PORTAL_MODULES = new Set([
  "coleta",
  "propostas",
  "certificados",
  "pessoal",
  "thermo",
  "pesos",
  "lista_mestra",
  "req5",
  "req6",
  "req7",
  "cadastros",
  "backup",
  "pedidos_compra",
  "solicitacao_orcamento",
  "req4",
  "req8",
  "tenant_users",
]);

export function normalizeDeploymentModel(tenant) {
  const m = tenant?.deployment_model;
  return m === DEPLOYMENT_MODELS.CLIENT_PORTAL ? DEPLOYMENT_MODELS.CLIENT_PORTAL : DEPLOYMENT_MODELS.FULL;
}

export function isClientPortalTenant(tenant) {
  return normalizeDeploymentModel(tenant) === DEPLOYMENT_MODELS.CLIENT_PORTAL;
}

export function isFullTenant(tenant) {
  return !isClientPortalTenant(tenant);
}

/** CTLI admin sempre vê ambiente full, mesmo em tenant client_portal (pré-visualização). */
export function effectiveDeploymentModel(tenant, role) {
  if (isCtliAdmin(role)) return DEPLOYMENT_MODELS.FULL;
  return normalizeDeploymentModel(tenant);
}

export function isEffectiveClientPortal(tenant, role) {
  return effectiveDeploymentModel(tenant, role) === DEPLOYMENT_MODELS.CLIENT_PORTAL;
}

export function canAccessModule({ tenant, role, module, user = null }) {
  if (!module) return true;
  if (isCtliAdmin(role)) return true;

  if (isFieldTechnicianRole(role)) {
    return module === "coleta";
  }

  if (isClientEnvironmentUser(role, user, tenant)) {
    if (module === "coleta") return canAccessColeta(role);
    if (module === "propostas") return canAccessCommercialProposals(role);
    if (module === "certificados") return canAccessCalibrationCertificates(role);
    if (module === "lista_mestra") return canAccessMasterDocuments(role);
    if (module === "req5" || module === "req7" || module === "req8") return true;
    return false;
  }

  const portal = isEffectiveClientPortal(tenant, role);

  if (module === "backup" || module === "admin_clients") {
    return isCtliAdmin(role);
  }

  if (module === "tenant_users") {
    return isCtliAdmin(role);
  }

  if (module === "pedidos_compra" || module === "solicitacao_orcamento") {
    return !portal && canAccessPurchaseOrders(role);
  }

  if (module === "req4") {
    return !portal;
  }

  if (portal) {
    if (module === "pedidos_compra" || module === "solicitacao_orcamento") return false;
    if (module === "backup" || module === "admin_clients" || module === "req4") return false;
    if (module === "tenant_users") return false;
    if (isClientPortalOperationsRole(role) || role === "client") {
      if (module === "coleta") return canAccessColeta(role);
      if (module === "propostas") return canAccessCommercialProposals(role);
      if (module === "certificados") return canAccessCalibrationCertificates(role);
      if (module === "pessoal") return canAccessPersonnel(role);
      if (module === "lista_mestra") return canAccessMasterDocuments(role);
      if (module === "thermo" || module === "pesos" || module === "balancas") return true;
      if (module === "req5" || module === "req6" || module === "req7" || module === "req8" || module === "cadastros") return true;
      return CLIENT_PORTAL_MODULES.has(module);
    }
    if (module === "coleta") return canAccessColeta(role);
    if (module === "propostas") return canAccessCommercialProposals(role);
    if (module === "certificados") return canAccessCalibrationCertificates(role);
    if (module === "pessoal") return canAccessPersonnel(role);
    if (module === "thermo" || module === "pesos" || module === "balancas") return true;
    if (module === "lista_mestra") return canAccessMasterDocuments(role);
    if (module === "req5") return true;
    if (module === "req6" || module === "req7" || module === "req8") return true;
    if (module === "cadastros") return true;
    return CLIENT_PORTAL_MODULES.has(module);
  }

  if (module === "coleta") return canAccessColeta(role);
  if (module === "certificados") return canAccessCalibrationCertificates(role);
  if (module === "propostas") return canAccessCommercialProposals(role);
  if (module === "pessoal") return canAccessPersonnel(role);
  if (module === "lista_mestra") return canAccessMasterDocuments(role);
  if (module === "pedidos_compra" || module === "solicitacao_orcamento") {
    return canAccessPurchaseOrders(role);
  }

  return true;
}

export function canAccessRequirement({ tenant, role, requirementId, user = null }) {
  const rid = String(requirementId);
  if (isCtliAdmin(role)) return true;
  if (isClientEnvironmentUser(role, user, tenant)) {
    return CLIENT_ENV_REQ_IDS.has(rid);
  }
  if (!isEffectiveClientPortal(tenant, role)) return true;
  return CLIENT_PORTAL_REQ_IDS.includes(rid);
}

export function canAccessRequirementFolder({ tenant, role, requirementId, folderKey, user = null }) {
  if (isCtliAdmin(role)) return true;
  if (isClientEnvironmentUser(role, user, tenant)) {
    const rid = String(requirementId);
    if (rid === "5") return CLIENT_ENV_REQ5_FOLDERS.has(folderKey);
    if (rid === "7") return CLIENT_ENV_REQ7_FOLDERS.has(folderKey);
    if (rid === "8") return CLIENT_ENV_REQ8_FOLDERS.has(folderKey);
    return false;
  }
  if (!isEffectiveClientPortal(tenant, role)) return true;
  const rid = String(requirementId);
  if (rid === "5") return true;
  if (rid === "6") return CLIENT_PORTAL_REQ6_FOLDERS.has(folderKey);
  if (rid === "7") return CLIENT_PORTAL_REQ7_FOLDERS.has(folderKey);
  if (rid === "8") return CLIENT_PORTAL_REQ8_FOLDERS.has(folderKey);
  return false;
}

export function canAccessCadastroSection({ tenant, role, sectionId, user = null }) {
  if (sectionId === "usuarios") return isCtliAdmin(role);
  if (sectionId === "config-coleta" || sectionId === "config-proposta") return false;
  if (isFieldTechnicianRole(role)) return false;
  if (isCtliAdmin(role)) return true;
  if (isClientEnvironmentUser(role, user, tenant)) return false;
  if (!isEffectiveClientPortal(tenant, role)) return true;
  if (sectionId === "tecnicos") return canManageTechnicians(role);
  return CLIENT_PORTAL_CADASTRO_SECTIONS.has(sectionId);
}

export function getCreatableRolesForProvisioner(provisionerRole) {
  if (provisionerRole === "admin") return ROLES.map((r) => r.value);
  if (provisionerRole === "client") return [...TENANT_ADMIN_CREATABLE_ROLES];
  return [];
}

export function canProvisionerAssignRole(provisionerRole, targetRole) {
  return getCreatableRolesForProvisioner(provisionerRole).includes(targetRole);
}

export const DEPLOYMENT_MODEL_OPTIONS = [
  { value: DEPLOYMENT_MODELS.FULL, label: "Completo (CTLI / interno)" },
  { value: DEPLOYMENT_MODELS.CLIENT_PORTAL, label: "Portal cliente (enxuto)" },
];

export function deploymentModelLabel(value) {
  return DEPLOYMENT_MODEL_OPTIONS.find((o) => o.value === value)?.label || value || "—";
}
