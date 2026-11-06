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
  cronograma_calibracao: { id: "cronograma_calibracao", label: "Cronograma de Calibração" },
  verificacao_equipamento: { id: "verificacao_equipamento", label: "Verificação de Equipamento" },
  programa_manutencao: { id: "programa_manutencao", label: "Programa de Manutenção" },
  registro_6_2a: { id: "registro_6_2a", label: "Adequação de competência" },
  registro_6_2b: { id: "registro_6_2b", label: "Avaliação do período de experiência" },
  registro_6_2c: { id: "registro_6_2c", label: "Competência do cargo" },
  registro_6_2d: { id: "registro_6_2d", label: "Lista de presença" },
  registro_6_2e: { id: "registro_6_2e", label: "Monitoramento de pessoal" },
  registro_6_2f: { id: "registro_6_2f", label: "Seleção de pessoal" },
  lista_mestra_internos: { id: "lista_mestra_internos", label: "Documentos Internos" },
  lista_mestra_externos: { id: "lista_mestra_externos", label: "Documentos Externos" },
  lista_mestra_software: { id: "lista_mestra_software", label: "Planilhas / Software" },
  lista_mestra_revisoes: { id: "lista_mestra_revisoes", label: "Histórico de Revisões" },
  lista_mestra_distribuicao: { id: "lista_mestra_distribuicao", label: "Distribuição" },
  lista_mestra_templates: { id: "lista_mestra_templates", label: "Templates de Exportação" },
  lista_mestra_gerados: { id: "lista_mestra_gerados", label: "Registros Gerados" },
  lista_mestra_alertas: { id: "lista_mestra_alertas", label: "Alertas" },
  lista_mestra_config: { id: "lista_mestra_config", label: "Configurações" },
  lista_mestra_registro: { id: "lista_mestra_registro", label: "Registro" },
  lista_mestra_configuracoes: { id: "lista_mestra_configuracoes", label: "Configurações" },
};

/** Abas antigas da lista mestra continuam a abrir dentro de Registro ou Configurações. */
export const MASTER_LIST_PARENT = {
  lista_mestra_internos: "lista_mestra_registro",
  lista_mestra_externos: "lista_mestra_registro",
  lista_mestra_software: "lista_mestra_registro",
  lista_mestra_revisoes: "lista_mestra_registro",
  lista_mestra_distribuicao: "lista_mestra_registro",
  lista_mestra_templates: "lista_mestra_configuracoes",
  lista_mestra_gerados: "lista_mestra_configuracoes",
  lista_mestra_alertas: "lista_mestra_configuracoes",
  lista_mestra_config: "lista_mestra_configuracoes",
};

/** Pastas com regras especiais (requisito 5). Requisito 4 pr-4-1 usa default (procedimento + registro). */
const FOLDER_MODES = {
  "pr-6-6": {
    sections: ["procedimento", "pedidos_compra", "solicitacoes_orcamento"],
    defaultSection: "procedimento",
    richEditor: false,
    fileOnly: true,
    purchaseOrders: true,
    quotationRequests: true,
  },
  "pr-7-1": {
    sections: ["procedimento", "propostas_comerciais"],
    defaultSection: "procedimento",
    richEditor: false,
    fileOnly: true,
    commercialProposals: true,
  },
  "pr-7-2": {
    sections: ["procedimento", "coleta_dados", "emissao_cert_balancas"],
    defaultSection: "procedimento",
    richEditor: false,
    fileOnly: true,
  },
  "pr-7-2-pesos": {
    sections: ["procedimento", "coleta_dados", "emissao_cert_peso_padrao"],
    defaultSection: "procedimento",
    richEditor: false,
    fileOnly: true,
  },
  "pr-6-4": {
    sections: ["procedimento", "ficha_tecnica", "cronograma_calibracao"],
    defaultSection: "procedimento",
    richEditor: false,
    fileOnly: true,
  },
  "pr-6-4-12": {
    sections: ["procedimento", "verificacao_equipamento", "programa_manutencao"],
    defaultSection: "procedimento",
    richEditor: false,
    fileOnly: true,
  },
  "pr-6-2": {
    sections: [
      "procedimento",
      "registro_6_2a",
      "registro_6_2b",
      "registro_6_2c",
      "registro_6_2d",
      "registro_6_2e",
      "registro_6_2f",
    ],
    defaultSection: "registro_6_2a",
    richEditor: false,
    fileOnly: true,
  },
  "manual-qualidade": {
    sections: ["procedimento"],
    defaultSection: "procedimento",
    richEditor: false,
    fileOnly: true,
    fileAccept: ".pdf,application/pdf",
    hideSectionTabs: true,
    hideSectionNav: true,
  },
  "documentacao-legal": {
    sections: ["documento"],
    defaultSection: "documento",
    richEditor: false,
    fileOnly: true,
    simpleMeta: true,
    fileAccept: ".pdf,application/pdf",
  },
  "estrutura-organizacional": {
    sections: ["registro"],
    defaultSection: "registro",
    richEditor: false,
    fileOnly: true,
    simpleMeta: true,
    fileAccept: "image/png,image/jpeg,image/webp,application/pdf,.pdf",
  },
  "politica-qualidade": {
    sections: ["registro"],
    defaultSection: "registro",
    richEditor: false,
    fileOnly: true,
    fileAccept: ".pdf,application/pdf",
  },
  assinaturas: { sections: ["assinatura"], defaultSection: "assinatura", richEditor: false, signatures: true },
  "pr-8-3": {
    sections: ["procedimento", "lista_mestra_registro", "lista_mestra_configuracoes"],
    defaultSection: "lista_mestra_registro",
    richEditor: false,
    fileOnly: true,
    fileAccept: ".pdf,application/pdf",
    masterDocumentList: true,
  },
};

const DEFAULT_MODE = {
  sections: ["procedimento", "registro"],
  defaultSection: "procedimento",
  richEditor: false,
  fileOnly: true,
  fileAccept: ".pdf,application/pdf",
};

const SPECIAL_FOLDER_REQ = {
  "pr-6-2": "6",
  "pr-6-4": "6",
  "pr-6-4-12": "6",
  "pr-6-6": "6",
  "pr-7-1": "7",
  "pr-7-2": "7",
  "pr-7-2-pesos": "7",
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

export function folderFileAccept(requirementId, folderKey) {
  return getFolderDocumentMode(requirementId, folderKey).fileAccept || ".pdf,application/pdf";
}

export function isSimpleDocumentMeta(requirementId, folderKey) {
  return getFolderDocumentMode(requirementId, folderKey).simpleMeta === true;
}

/** Onde um PDF da lista mestra deve ficar, a partir do código e do tipo. */
export function routeForMasterDocument({ code = "", type = "", category = "", system_folder_key = "" }) {
  const codeText = String(code || "");
  const kind = `${type} ${category}`.toLowerCase();
  if (/^MQ-/i.test(codeText) || kind.includes("manual")) {
    return { requirement: "5", folderKey: "manual-qualidade", section: "procedimento" };
  }
  if (kind.includes("politica") || kind.includes("política")) {
    return { requirement: "5", folderKey: "politica-qualidade", section: "registro" };
  }
  if (String(category) === "Documento" || type === "documento_interno") {
    return { requirement: "5", folderKey: "documentacao-legal", section: "documento" };
  }
  const folder = SPECIAL_FOLDER_REQ[system_folder_key] ? system_folder_key : "";
  if (!folder) return null;
  const section = kind.includes("registro") ? "registro" : "procedimento";
  const mode = FOLDER_MODES[folder];
  const resolvedSection = mode?.sections?.includes(section) ? section : (mode?.sections?.[0] || "procedimento");
  return { requirement: SPECIAL_FOLDER_REQ[folder], folderKey: folder, section: resolvedSection };
}
