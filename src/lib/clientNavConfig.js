import { COLETA_LIST_PATH } from "@/lib/coletaRoutes";
import { CERTIFICATE_LIST_PATH } from "@/lib/certificateRoutes";
import { WEIGHT_CERTIFICATE_LIST_PATH } from "@/lib/weightCalibration/weightCertificateRoutes";
import { PROPOSAL_LIST_PATH } from "@/lib/commercialProposals/commercialProposalRoutes";
import { PEDIDOS_LIST_PATH } from "@/lib/pedidosCompraRoutes";
import { QUOTATION_LIST_PATH } from "@/lib/quotationRequestsRoutes";
import { DOCUMENT_SECTIONS } from "@/lib/documentFolderConfig";
import { masterDocumentListPath } from "@/lib/masterDocuments/masterDocumentRoutes";
import { usesClientSidebarNav } from "@/lib/roleNav";
import {
  isAclActive,
  aclAllowsModule,
  aclAllowsFolder,
  aclAllowedRequirementPathPrefixes,
} from "@/lib/accessAcl";
import { isFolderAllowedForNonCtli, isCtliOnlyRequirement } from "@/lib/ctliOnlyFolders";

export const MANUAL_QUALIDADE_PATH = "/requirement/5/manual-qualidade";

const LISTA_MESTRA_TAB_IDS = [
  "lista_mestra_internos",
  "lista_mestra_externos",
  "lista_mestra_software",
  "lista_mestra_revisoes",
  "lista_mestra_distribuicao",
  "lista_mestra_gerados",
  "lista_mestra_alertas",
];

export const CLIENT_ENV_REQ_IDS = new Set(["5", "7", "8"]);

export const CLIENT_ENV_REQ5_FOLDERS = new Set(["manual-qualidade"]);

export const CLIENT_ENV_REQ7_FOLDERS = new Set(["pr-7-1", "pr-7-2", "pr-7-6"]);

export const CLIENT_ENV_REQ8_FOLDERS = new Set(["pr-8-3"]);

/** Utilizador vinculado a tenant cliente (menu enxuto). */
export function isClientEnvironmentUser(role, user, tenant = null) {
  return usesClientSidebarNav(role, tenant, user);
}

export function getClientListaMestraNavItems() {
  return LISTA_MESTRA_TAB_IDS.map((tabId) => ({
    key: tabId,
    label: DOCUMENT_SECTIONS[tabId]?.label || tabId,
    to: masterDocumentListPath(tabId),
  }));
}

/**
 * Itens de topo do menu cliente (exceto Lista Mestra accordion).
 * `requires*` flags filtram por permissão de papel no Layout.
 */
export const CLIENT_TOP_NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", to: "/dashboard" },
  { id: "propostas", label: "Propostas", to: PROPOSAL_LIST_PATH, requiresCommercialProposals: true },
  { id: "coleta", label: "Coleta de dados", to: COLETA_LIST_PATH, requiresColeta: true },
  { id: "certificados", label: "Cert. balanças", to: CERTIFICATE_LIST_PATH, requiresCalibrationCertificates: true },
  { id: "certificados-peso", label: "Cert. pesos", to: WEIGHT_CERTIFICATE_LIST_PATH, requiresCalibrationCertificates: true },
  { id: "pedidos-compra", label: "Pedidos de compra", to: PEDIDOS_LIST_PATH, requiresPurchaseOrders: true },
  { id: "solicitacoes-orcamento", label: "Solicitações de orçamento", to: QUOTATION_LIST_PATH, requiresQuotationRequests: true },
  { id: "manual-qualidade", label: "Manual da Qualidade", to: MANUAL_QUALIDADE_PATH },
];

const ALLOWED_PATH_PREFIXES = [
  "/dashboard",
  "/ajuda",
  PROPOSAL_LIST_PATH,
  COLETA_LIST_PATH,
  CERTIFICATE_LIST_PATH,
  WEIGHT_CERTIFICATE_LIST_PATH,
  PEDIDOS_LIST_PATH,
  QUOTATION_LIST_PATH,
  MANUAL_QUALIDADE_PATH,
  "/requirement/5/manual-qualidade",
  "/requirement/7/pr-7-1",
  "/requirement/7/pr-7-2",
  "/requirement/7/pr-7-6",
  "/requirement/8/pr-8-3",
  "/lista-mestra",
];

function matchesAllowedPrefix(pathname, prefixes = ALLOWED_PATH_PREFIXES) {
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * Rotas permitidas para utilizadores com menu cliente (bloqueio por URL).
 * Com ACL ativa, pastas/módulos vêm da seleção da conta.
 */
export function isClientAllowedPath(pathname, user = null) {
  if (!pathname) return false;
  if (pathname === "/login") return true;

  if (pathname.startsWith("/backup")) return false;
  if (pathname.startsWith("/admin")) return false;

  const acl = user?.access_acl;
  if (isAclActive(acl)) {
    if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) return true;
    if (pathname === "/ajuda" || pathname.startsWith("/ajuda/")) return true;

    if (pathname.startsWith(PROPOSAL_LIST_PATH) || pathname.includes("/pr-7-1")) {
      return aclAllowsModule(acl, "propostas")
        || matchesAllowedPrefix(pathname, aclAllowedRequirementPathPrefixes(acl));
    }
    if (pathname.startsWith(COLETA_LIST_PATH) || (pathname.includes("/pr-7-2") && pathname.includes("/coleta"))) {
      return aclAllowsModule(acl, "coleta");
    }
    if (pathname.startsWith(CERTIFICATE_LIST_PATH) || pathname.startsWith(WEIGHT_CERTIFICATE_LIST_PATH)) {
      return aclAllowsModule(acl, "certificados");
    }
    if (pathname.startsWith("/pedidos-compra")) {
      return aclAllowsModule(acl, "pedidos_compra") || aclAllowsFolder(acl, "6", "pr-6-6");
    }
    if (pathname.startsWith("/solicitacoes-orcamento")) {
      return aclAllowsModule(acl, "solicitacao_orcamento")
        || aclAllowsModule(acl, "pedidos_compra")
        || aclAllowsFolder(acl, "6", "pr-6-6");
    }
    if (pathname.startsWith("/lista-mestra") || pathname.includes("/pr-8-3")) {
      return aclAllowsModule(acl, "lista_mestra")
        || matchesAllowedPrefix(pathname, aclAllowedRequirementPathPrefixes(acl));
    }
    if (pathname.includes("/cadastro/")) {
      return aclAllowsModule(acl, "cadastros")
        && matchesAllowedPrefix(pathname, aclAllowedRequirementPathPrefixes(acl));
    }
    if (pathname.startsWith("/requirement/")) {
      const m = pathname.match(/^\/requirement\/([^/]+)\/([^/]+)/);
      if (m) {
        const rid = m[1];
        const fk = m[2];
        if (isCtliOnlyRequirement(rid) || !isFolderAllowedForNonCtli(rid, fk)) return false;
      }
      return matchesAllowedPrefix(pathname, aclAllowedRequirementPathPrefixes(acl));
    }
    return false;
  }

  if (pathname.startsWith("/cadastros")) return false;
  if (pathname.startsWith("/pedidos-compra")) return false;
  if (pathname.startsWith("/solicitacoes-orcamento")) return false;

  if (pathname.match(/^\/requirement\/4(\/|$)/)) return false;
  if (pathname.match(/^\/requirement\/6(\/|$)/)) return false;

  if (pathname.includes("/pr-8-3/config/")) return false;

  if (pathname.match(/^\/requirement\/5\/(?!manual-qualidade)/)) return false;
  if (pathname.match(/^\/requirement\/7\/(?!pr-7-1|pr-7-2|pr-7-6)/)) return false;
  if (pathname.match(/^\/requirement\/8\/(?!pr-8-3)/)) return false;

  return matchesAllowedPrefix(pathname);
}
