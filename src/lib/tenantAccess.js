import {
  ROLES,
  isCtliAdmin,
  isFieldTechnicianRole,
  isSignatoryRole,
  isDirectorRole,
  isGerenteGeralRole,
  canAccessColeta,
  canAccessCalibrationCertificates,
  canAccessCommercialProposals,
  canAccessPersonnel,
  canAccessMasterDocuments,
  canAccessPurchaseOrders,
  canManageTechnicians,
  canAccessCadastrosMenu,
  canManageTenantUsers,
} from "@/lib/roles";
import {
  CLIENT_ENV_REQ_IDS,
  CLIENT_ENV_REQ5_FOLDERS,
  CLIENT_ENV_REQ7_FOLDERS,
  CLIENT_ENV_REQ8_FOLDERS,
  isClientEnvironmentUser,
} from "@/lib/clientNavConfig";
import {
  isAclActive,
  aclAllowsModule,
  aclAllowsRequirement,
  aclAllowsFolder,
  aclAllowsCadastroSection,
} from "@/lib/accessAcl";

export const DEPLOYMENT_MODELS = {
  FULL: "full",
  CLIENT_PORTAL: "client_portal",
};

export const TENANT_ADMIN_CREATABLE_ROLES = [
  "tecnico_campo",
  "signatario",
  "administrativo_vendas",
  "administrativo_compras",
  "gerente_qualidade",
  "gerente_tecnico",
  "gerente_geral",
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
  "fornecedores",
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

/** Pastas liberadas por papel (matriz RBAC). */
const ROLE_REQ_ACCESS = {
  gerente_qualidade: { reqs: new Set(["4", "6", "8"]), folders: null },
  gerente_tecnico: { reqs: new Set(["7"]), folders: null },
  administrativo_vendas: {
    reqs: new Set(["7"]),
    folders: { "7": new Set(["pr-7-1", "pr-7-1-7"]) },
  },
  administrativo_compras: {
    reqs: new Set(["6"]),
    folders: { "6": new Set(["pr-6-6"]) },
  },
};

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

function isCtliOnlyModule(module) {
  return module === "backup" || module === "admin_clients";
}

export function canAccessModule({ tenant, role, module, user = null }) {
  if (!module) return true;
  if (isCtliAdmin(role)) return true;

  if (isCtliOnlyModule(module)) return false;

  if (module === "tenant_users") {
    return canManageTenantUsers(role);
  }

  // ACL granular por conta (quando ativa) — tem prioridade sobre defaults do papel
  // (funções extras ou remoção de acessos em contas novas).
  if (isAclActive(user?.access_acl)) {
    if (module === "coleta") return aclAllowsModule(user.access_acl, "coleta");
    if (module === "certificados") return aclAllowsModule(user.access_acl, "certificados");
    if (module === "propostas") return aclAllowsModule(user.access_acl, "propostas");
    if (module === "pessoal") return aclAllowsModule(user.access_acl, "pessoal");
    if (module === "lista_mestra") return aclAllowsModule(user.access_acl, "lista_mestra");
    if (module === "pedidos_compra" || module === "solicitacao_orcamento") {
      return aclAllowsModule(user.access_acl, module);
    }
    if (module === "cadastros" || module === "thermo" || module === "pesos" || module === "balancas") {
      return aclAllowsModule(user.access_acl, "cadastros");
    }
    if (module === "req4" || module === "req5" || module === "req6" || module === "req7" || module === "req8") {
      return aclAllowsModule(user.access_acl, module);
    }
    return aclAllowsModule(user.access_acl, module);
  }

  if (isFieldTechnicianRole(role)) {
    return module === "coleta";
  }

  if (isSignatoryRole(role)) {
    return module === "certificados";
  }

  if (isDirectorRole(role)) {
    return false;
  }

  if (isGerenteGeralRole(role)) {
    if (module === "coleta") return canAccessColeta(role, user);
    if (module === "propostas") return canAccessCommercialProposals(role, user);
    if (module === "certificados") return canAccessCalibrationCertificates(role, user);
    if (module === "pessoal") return canAccessPersonnel(role, user);
    if (module === "lista_mestra") return canAccessMasterDocuments(role, user);
    if (module === "pedidos_compra" || module === "solicitacao_orcamento") {
      return canAccessPurchaseOrders(role, user);
    }
    if (module === "cadastros" || module === "thermo" || module === "pesos" || module === "balancas") {
      return true;
    }
    if (module === "req4" || module === "req5" || module === "req6" || module === "req7" || module === "req8") {
      return true;
    }
    return CLIENT_PORTAL_MODULES.has(module);
  }

  // Conta cliente (portal enxuto) — legado sem ACL
  if (isClientEnvironmentUser(role, user, tenant)) {
    if (module === "coleta") return canAccessColeta(role, user);
    if (module === "propostas") return canAccessCommercialProposals(role, user);
    if (module === "certificados") return canAccessCalibrationCertificates(role, user);
    if (module === "lista_mestra") return canAccessMasterDocuments(role, user);
    if (module === "req5" || module === "req7" || module === "req8") return true;
    return false;
  }

  if (module === "coleta") return canAccessColeta(role, user);
  if (module === "certificados") return canAccessCalibrationCertificates(role, user);
  if (module === "propostas") return canAccessCommercialProposals(role, user);
  if (module === "pessoal") return canAccessPersonnel(role, user);
  if (module === "lista_mestra") return canAccessMasterDocuments(role, user);
  if (module === "pedidos_compra" || module === "solicitacao_orcamento") {
    return canAccessPurchaseOrders(role, user);
  }
  if (module === "cadastros") return canAccessCadastrosMenu(role);
  if (module === "thermo" || module === "pesos" || module === "balancas") {
    return canAccessCadastrosMenu(role);
  }
  if (module === "req4") {
    return role === "gerente_qualidade" || isGerenteGeralRole(role);
  }
  if (module === "req5") {
    return role === "client" || isGerenteGeralRole(role);
  }
  if (module === "req6") {
    return ["gerente_qualidade", "administrativo_compras", "gerente_geral"].includes(role);
  }
  if (module === "req7") {
    return ["gerente_tecnico", "administrativo_vendas", "gerente_geral", "client"].includes(role);
  }
  if (module === "req8") {
    return ["gerente_qualidade", "gerente_geral", "client"].includes(role);
  }

  return false;
}

export function canAccessRequirement({ tenant, role, requirementId, user = null }) {
  const rid = String(requirementId);
  if (isCtliAdmin(role)) return true;

  if (isAclActive(user?.access_acl)) {
    return aclAllowsRequirement(user.access_acl, rid);
  }

  if (isFieldTechnicianRole(role) || isSignatoryRole(role) || isDirectorRole(role)) {
    return false;
  }

  if (isGerenteGeralRole(role)) return true;

  if (isClientEnvironmentUser(role, user, tenant)) {
    return CLIENT_ENV_REQ_IDS.has(rid);
  }

  const matrix = ROLE_REQ_ACCESS[role];
  if (matrix) return matrix.reqs.has(rid);

  // Portal legado / client sem user context
  if (role === "client") {
    if (isEffectiveClientPortal(tenant, role)) return CLIENT_PORTAL_REQ_IDS.includes(rid);
    return CLIENT_ENV_REQ_IDS.has(rid);
  }

  if (!isEffectiveClientPortal(tenant, role)) {
    // Full tenant: papéis sem matriz restritiva
    return true;
  }

  return CLIENT_PORTAL_REQ_IDS.includes(rid);
}

export function canAccessRequirementFolder({ tenant, role, requirementId, folderKey, user = null }) {
  if (isCtliAdmin(role)) return true;

  if (isAclActive(user?.access_acl)) {
    return aclAllowsFolder(user.access_acl, requirementId, folderKey);
  }

  if (isFieldTechnicianRole(role) || isSignatoryRole(role) || isDirectorRole(role)) {
    return false;
  }

  if (isGerenteGeralRole(role)) return true;

  if (isClientEnvironmentUser(role, user, tenant)) {
    const rid = String(requirementId);
    if (rid === "5") return CLIENT_ENV_REQ5_FOLDERS.has(folderKey);
    if (rid === "7") return CLIENT_ENV_REQ7_FOLDERS.has(folderKey);
    if (rid === "8") return CLIENT_ENV_REQ8_FOLDERS.has(folderKey);
    return false;
  }

  const matrix = ROLE_REQ_ACCESS[role];
  if (matrix) {
    const rid = String(requirementId);
    if (!matrix.reqs.has(rid)) return false;
    if (matrix.folders?.[rid]) return matrix.folders[rid].has(folderKey);
    return true;
  }

  if (role === "client") {
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
  if (isCtliAdmin(role)) return true;

  if (isAclActive(user?.access_acl)) {
    return aclAllowsCadastroSection(user.access_acl, sectionId);
  }

  if (isFieldTechnicianRole(role) || isSignatoryRole(role) || isDirectorRole(role)) return false;

  if (isGerenteGeralRole(role)) return true;

  if (isClientEnvironmentUser(role, user, tenant)) return false;

  if (!canAccessCadastrosMenu(role)) return false;

  if (sectionId === "tecnicos") return canManageTechnicians(role) || canAccessCadastrosMenu(role);

  // Secções de cadastro alinhadas às pastas do papel
  if (role === "administrativo_compras") {
    return sectionId === "fornecedores" || CLIENT_PORTAL_CADASTRO_SECTIONS.has(sectionId);
  }

  return true;
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
