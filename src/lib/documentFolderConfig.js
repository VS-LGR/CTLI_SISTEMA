/**
 * Metadados de conteúdo por pasta (requisitos 4–5).
 * section: procedimento | registro | documento | assinatura
 */

export const DOCUMENT_SECTIONS = {
  procedimento: { id: "procedimento", label: "Procedimentos" },
  registro: { id: "registro", label: "Registros" },
  documento: { id: "documento", label: "Documentos" },
  assinatura: { id: "assinatura", label: "Assinaturas" },
  pedidos_compra: { id: "pedidos_compra", label: "Pedidos de compra" },
  solicitacoes_orcamento: { id: "solicitacoes_orcamento", label: "Solicitações de orçamento" },
  propostas_comerciais: { id: "propostas_comerciais", label: "Propostas Comerciais" },
  lista_mestra_internos: { id: "lista_mestra_internos", label: "Documentos Internos" },
  lista_mestra_externos: { id: "lista_mestra_externos", label: "Documentos Externos" },
  lista_mestra_revisoes: { id: "lista_mestra_revisoes", label: "Histórico de Revisões" },
  lista_mestra_distribuicao: { id: "lista_mestra_distribuicao", label: "Distribuição" },
  lista_mestra_templates: { id: "lista_mestra_templates", label: "Templates de Exportação" },
  lista_mestra_gerados: { id: "lista_mestra_gerados", label: "Registros Gerados" },
  lista_mestra_alertas: { id: "lista_mestra_alertas", label: "Alertas" },
  lista_mestra_config: { id: "lista_mestra_config", label: "Configurações" },
};

/** Pastas com regras especiais (requisito 5). Requisito 4 pr-4-1 usa default (procedimento + registro). */
const FOLDER_MODES = {
  "pr-6-6": {
    sections: ["procedimento", "pedidos_compra", "solicitacoes_orcamento"],
    defaultSection: "procedimento",
    richEditor: true,
    purchaseOrders: true,
    quotationRequests: true,
  },
  "pr-7-1": {
    sections: ["procedimento", "propostas_comerciais"],
    defaultSection: "procedimento",
    richEditor: true,
    commercialProposals: true,
  },
  "pr-6-2": {
    sections: ["procedimento", "registro"],
    defaultSection: "registro",
    richEditor: true,
  },
  "manual-qualidade": {
    sections: ["procedimento"],
    defaultSection: "procedimento",
    richEditor: true,
    hideSectionTabs: true,
    hideSectionNav: true,
  },
  "documentacao-legal": { sections: ["documento"], defaultSection: "documento", richEditor: false, fileOnly: true },
  "estrutura-organizacional": { sections: ["registro"], defaultSection: "registro", richEditor: true },
  "politica-qualidade": { sections: ["registro"], defaultSection: "registro", richEditor: true },
  assinaturas: { sections: ["assinatura"], defaultSection: "assinatura", richEditor: false, signatures: true },
  "pr-8-3": {
    sections: [
      "procedimento",
      "lista_mestra_internos",
      "lista_mestra_externos",
      "lista_mestra_revisoes",
      "lista_mestra_distribuicao",
      "lista_mestra_templates",
      "lista_mestra_gerados",
      "lista_mestra_alertas",
      "lista_mestra_config",
    ],
    defaultSection: "lista_mestra_internos",
    richEditor: true,
    masterDocumentList: true,
  },
};

const DEFAULT_MODE = {
  sections: ["procedimento", "registro"],
  defaultSection: "procedimento",
  richEditor: true,
};

export function getFolderDocumentMode(requirementId, folderKey) {
  const rid = String(requirementId);
  if (folderKey && FOLDER_MODES[folderKey]) {
    if (
      rid === "5"
      || (rid === "6" && (folderKey === "pr-6-6" || folderKey === "pr-6-2"))
      || (rid === "7" && folderKey === "pr-7-1")
      || (rid === "8" && folderKey === "pr-8-3")
    ) {
      return { ...FOLDER_MODES[folderKey] };
    }
  }
  return { ...DEFAULT_MODE };
}

export function isPurchaseOrdersFolder(requirementId, folderKey) {
  return String(requirementId) === "6" && folderKey === "pr-6-6";
}

export function isQuotationRequestsFolder(requirementId, folderKey) {
  return String(requirementId) === "6" && folderKey === "pr-6-6";
}

export function isCommercialProposalsFolder(requirementId, folderKey) {
  return String(requirementId) === "7" && folderKey === "pr-7-1";
}

export function getVisibleSections(requirementId, folderKey) {
  const mode = getFolderDocumentMode(requirementId, folderKey);
  return mode.sections.map((id) => DOCUMENT_SECTIONS[id]).filter(Boolean);
}

export function isSignaturesFolder(requirementId, folderKey) {
  return getFolderDocumentMode(requirementId, folderKey).signatures === true;
}

export function isFileOnlyFolder(requirementId, folderKey) {
  return getFolderDocumentMode(requirementId, folderKey).fileOnly === true;
}

export function allowsRichEditor(requirementId, folderKey) {
  return getFolderDocumentMode(requirementId, folderKey).richEditor !== false;
}

export function isMasterDocumentListFolder(requirementId, folderKey) {
  return getFolderDocumentMode(requirementId, folderKey).masterDocumentList === true;
}
