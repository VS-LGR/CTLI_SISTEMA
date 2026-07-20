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
  coleta_dados: { id: "coleta_dados", label: "Coleta de Dados" },
  emissao_cert_balancas: {
    id: "emissao_cert_balancas",
    label: "Emissão de Certificado de Calibração de Balanças",
  },
  emissao_cert_peso_padrao: {
    id: "emissao_cert_peso_padrao",
    label: "Emissão de Certificados de Calibração de Peso Padrão",
  },
  ficha_tecnica: { id: "ficha_tecnica", label: "Ficha Técnica" },
  verificacao_equipamento: { id: "verificacao_equipamento", label: "Verificação de Equipamento" },
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
  "pr-7-2": {
    sections: ["procedimento", "coleta_dados", "emissao_cert_balancas", "emissao_cert_peso_padrao"],
    defaultSection: "procedimento",
    richEditor: true,
  },
  "pr-6-4": {
    sections: ["procedimento", "ficha_tecnica"],
    defaultSection: "procedimento",
    richEditor: true,
  },
  "pr-6-4-12": {
    sections: ["procedimento", "verificacao_equipamento"],
    defaultSection: "procedimento",
    richEditor: true,
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

const SPECIAL_FOLDER_REQ = {
  "pr-6-2": "6",
  "pr-6-4": "6",
  "pr-6-4-12": "6",
  "pr-6-6": "6",
  "pr-7-1": "7",
  "pr-7-2": "7",
  "pr-8-3": "8",
  "manual-qualidade": "5",
  "documentacao-legal": "5",
  "estrutura-organizacional": "5",
  "politica-qualidade": "5",
  assinaturas: "5",
};

export function getFolderDocumentMode(requirementId, folderKey) {
  const rid = String(requirementId);
  if (folderKey && FOLDER_MODES[folderKey]) {
    const expectedReq = SPECIAL_FOLDER_REQ[folderKey];
    if (expectedReq ? rid === expectedReq : rid === "5") {
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
