import { canAccessColeta, canAccessPurchaseOrders, canAccessQuotationRequests } from "@/lib/roles";
import { getVisibleCadastroSections } from "@/lib/cadastroSections";
import { COLETA_LIST_PATH } from "@/lib/coletaRoutes";
import { PR_66_PEDIDOS_PATH } from "@/lib/pedidosCompraRoutes";
import { PR_66_QUOTATION_PATH } from "@/lib/quotationRequestsRoutes";

/** Atalhos da dashboard — atualizar `to` e `enabled` quando rotas forem definidas. */
export const DASHBOARD_SHORTCUTS = [
  {
    id: "coleta",
    label: "Coleta de Dados",
    to: COLETA_LIST_PATH,
    enabled: true,
    requiresColeta: true,
  },
  { id: "propostas", label: "Propostas", enabled: false },
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
  { id: "ensaio-proficiencia", label: "Ensaio de Proficiência", enabled: false },
  { id: "lista-mestra", label: "Lista Mestra", enabled: false },
];

/**
 * @returns {Array<{ id: string, label: string, to?: string, active: boolean, disabledReason?: string }>}
 */
export function getVisibleDashboardShortcuts(role) {
  const visibleCadastroIds = new Set(
    getVisibleCadastroSections(role).map((s) => s.id),
  );

  return DASHBOARD_SHORTCUTS.map((item) => {
    if (!item.enabled) {
      return {
        id: item.id,
        label: item.label,
        active: false,
        disabledReason: "Destino em definição",
      };
    }

    if (item.requiresColeta && !canAccessColeta(role)) {
      return {
        id: item.id,
        label: item.label,
        active: false,
        disabledReason: "Sem permissão para aceder à coleta",
      };
    }

    if (item.requiresPurchaseOrders && !canAccessPurchaseOrders(role)) {
      return {
        id: item.id,
        label: item.label,
        active: false,
        disabledReason: "Sem permissão para pedidos de compra",
      };
    }

    if (item.requiresQuotationRequests && !canAccessQuotationRequests(role)) {
      return {
        id: item.id,
        label: item.label,
        active: false,
        disabledReason: "Sem permissão para solicitações de orçamento",
      };
    }

    if (item.cadastroSectionId && !visibleCadastroIds.has(item.cadastroSectionId)) {
      return {
        id: item.id,
        label: item.label,
        active: false,
        disabledReason: "Secção de cadastros não disponível para o seu perfil",
      };
    }

    return {
      id: item.id,
      label: item.label,
      to: item.to,
      active: true,
    };
  });
}
