import { canAccessColeta, canAccessPurchaseOrders, canAccessQuotationRequests, canAccessCommercialProposals, canAccessMasterDocuments, canAccessPersonnel, canAccessCalibrationCertificates } from "@/lib/roles";
import { getVisibleCadastroSections } from "@/lib/cadastroSections";
import { isEffectiveClientPortal, canAccessModule } from "@/lib/tenantAccess";
import { COLETA_LIST_PATH } from "@/lib/coletaRoutes";
import { PR_66_PEDIDOS_PATH } from "@/lib/pedidosCompraRoutes";
import { PR_66_QUOTATION_PATH } from "@/lib/quotationRequestsRoutes";
import { PR_71_PROPOSAL_PATH } from "@/lib/commercialProposals/commercialProposalRoutes";
import { LISTA_MESTRA_PATH } from "@/lib/masterDocuments/masterDocumentRoutes";
import { CERTIFICATE_LIST_PATH } from "@/lib/certificateRoutes";

/** Atalhos da dashboard — atualizar `to` e `enabled` quando rotas forem definidas. */
export const DASHBOARD_SHORTCUTS = [
  {
    id: "coleta",
    label: "Coleta de Dados",
    to: COLETA_LIST_PATH,
    enabled: true,
    requiresColeta: true,
  },
  { id: "propostas", label: "Propostas", to: PR_71_PROPOSAL_PATH, enabled: true, requiresCommercialProposals: true },
  {
    id: "pedidos-compra",
    label: "Pedidos de Compra",
    to: PR_66_PEDIDOS_PATH,
    enabled: true,
    requiresPurchaseOrders: true,
  },
  {
    id: "solicitacao-orcamento",
    label: "Solicitação de Orçamento",
    to: PR_66_QUOTATION_PATH,
    enabled: true,
    requiresQuotationRequests: true,
  },
  {
    id: "termo-baro-higro",
    label: "Termo-Baro-Higrometros",
    to: "/cadastros/thermo",
    enabled: true,
    cadastroSectionId: "thermo",
  },
  {
    id: "pesos-padrao",
    label: "Pesos Padrão",
    to: "/cadastros/pesos",
    enabled: true,
    cadastroSectionId: "pesos",
  },
  {
    id: "certificados",
    label: "Certificados",
    to: CERTIFICATE_LIST_PATH,
    enabled: true,
    requiresCalibrationCertificates: true,
  },
  {
    id: "lista-mestra",
    label: "Lista Mestra",
    to: LISTA_MESTRA_PATH,
    enabled: true,
    requiresMasterDocuments: true,
  },
];

/** Atalhos da dashboard enxuta (portal cliente). */
export const CLIENT_PORTAL_SHORTCUTS = [
  { id: "coleta", label: "Coleta", to: COLETA_LIST_PATH, module: "coleta", requiresColeta: true },
  { id: "propostas", label: "Proposta", to: PR_71_PROPOSAL_PATH, module: "propostas", requiresCommercialProposals: true },
  { id: "termo-baro-higro", label: "Termo-baro-higrômetro", to: "/cadastros/thermo", module: "thermo" },
  { id: "pesos-padrao", label: "Peso-padrão", to: "/cadastros/pesos", module: "pesos" },
  { id: "pessoal", label: "Pessoal", to: "/requirement/6/pr-6-2", module: "pessoal", requiresPersonnel: true },
  { id: "certificados", label: "Certificados", to: CERTIFICATE_LIST_PATH, module: "certificados", requiresCalibrationCertificates: true },
];

function mapShortcutItem(item, { role, tenant, visibleCadastroIds }) {
  if (!item.enabled && item.enabled !== undefined) {
    return { id: item.id, label: item.label, active: false, disabledReason: "Destino em definição" };
  }

  if (item.module && !canAccessModule({ tenant, role, module: item.module })) {
    return { id: item.id, label: item.label, active: false, disabledReason: "Módulo não disponível neste ambiente" };
  }

  if (item.requiresColeta && !canAccessColeta(role)) {
    return { id: item.id, label: item.label, active: false, disabledReason: "Sem permissão para aceder à coleta" };
  }

  if (item.requiresPurchaseOrders && !canAccessPurchaseOrders(role)) {
    return { id: item.id, label: item.label, active: false, disabledReason: "Sem permissão para pedidos de compra" };
  }

  if (item.requiresQuotationRequests && !canAccessQuotationRequests(role)) {
    return { id: item.id, label: item.label, active: false, disabledReason: "Sem permissão para solicitações de orçamento" };
  }

  if (item.requiresCommercialProposals && !canAccessCommercialProposals(role)) {
    return { id: item.id, label: item.label, active: false, disabledReason: "Sem permissão para propostas comerciais" };
  }

  if (item.requiresMasterDocuments && !canAccessMasterDocuments(role)) {
    return { id: item.id, label: item.label, active: false, disabledReason: "Sem permissão para Lista Mestra" };
  }

  if (item.requiresPersonnel && !canAccessPersonnel(role)) {
    return { id: item.id, label: item.label, active: false, disabledReason: "Sem permissão para pessoal" };
  }

  if (item.requiresCalibrationCertificates && !canAccessCalibrationCertificates(role)) {
    return { id: item.id, label: item.label, active: false, disabledReason: "Sem permissão para certificados" };
  }

  if (item.cadastroSectionId && !visibleCadastroIds.has(item.cadastroSectionId)) {
    return { id: item.id, label: item.label, active: false, disabledReason: "Secção de cadastros não disponível para o seu perfil" };
  }

  return { id: item.id, label: item.label, to: item.to, active: true };
}

/**
 * @returns {Array<{ id: string, label: string, to?: string, active: boolean, disabledReason?: string }>}
 */
export function getVisibleDashboardShortcuts(role, tenant = null) {
  const visibleCadastroIds = new Set(
    getVisibleCadastroSections(role, tenant).map((s) => s.id),
  );

  if (isEffectiveClientPortal(tenant, role)) {
    return CLIENT_PORTAL_SHORTCUTS.map((item) => mapShortcutItem(item, { role, tenant, visibleCadastroIds }))
      .filter((s) => s.active);
  }

  return DASHBOARD_SHORTCUTS.map((item) => mapShortcutItem(item, { role, tenant, visibleCadastroIds }));
}
