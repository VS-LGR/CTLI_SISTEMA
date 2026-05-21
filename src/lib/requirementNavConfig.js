/**
 * Navegação por requisito (4–8) e subsessões (pastas) para 5–8.
 * Conteúdo editável aqui; rotas usam folderKey na URL (sem dois-pontos).
 */

import { COLETA_LIST_PATH } from "./coletaRoutes";

export const REQ_NAMES = {
  "4": "Requisitos Gerais",
  "5": "Requisitos de Estrutura",
  "6": "Requisitos de Recurso",
  "7": "Requisitos de Processo",
  "8": "Requisitos de Gestão",
};

/** Itens de menu principal (sidebar) — id alinhado à API `requirement`. */
export const REQ_MENU_ITEMS = [
  { id: "4", name: "Gerais" },
  { id: "5", name: "Estrutura" },
  { id: "6", name: "Recurso" },
  { id: "7", name: "Processo" },
  { id: "8", name: "Gestão" },
];

const FOLDERS = {
  "5": [
    { folderKey: "manual-qualidade", label: "Manual da Qualidade" },
    { folderKey: "politica-qualidade", label: "Política da Qualidade" },
    { folderKey: "documentacao-legal", label: "Documentação Legal" },
    { folderKey: "estrutura-organizacional", label: "Estrutura Organizacional" },
    { folderKey: "assinaturas", label: "Assinaturas" },
  ],
  "6": [
    { folderKey: "pr-6-2", label: "PR-6.2 Pessoal" },
    { folderKey: "pr-6-4", label: "PR-6.4 Equipamentos" },
    { folderKey: "pr-6-4-10", label: "PR-6.4.10 Checagens Intermediárias" },
    { folderKey: "pr-6-4-12", label: "PR-6.4.12 Manutenção de Equipamentos" },
    { folderKey: "pr-6-5", label: "PR-6.5 Rastreabilidade Metrológica" },
    { folderKey: "pr-6-6", label: "PR-6.6 Produtos e Serviços Providos Externamente" },
  ],
  "7": [
    { folderKey: "pr-7-1", label: "PR-7.1 Análise Crítica de Pedidos, Propostas e Contratos" },
    { folderKey: "pr-7-1-7", label: "PR-7.1.7 Atendimento ao Cliente" },
    { folderKey: "pr-7-10", label: "PR-7.10 Trabalho Não Conforme" },
    { folderKey: "pr-7-11", label: "PR-7.11 Controle de Dados e Gestão da Informação" },
    {
      folderKey: "pr-7-2",
      label: "PR-7.2 Calibração de Balanças",
      children: [
        {
          key: "coleta",
          label: "Coleta de dados (RE-7.2A)",
          to: COLETA_LIST_PATH,
          requiresColeta: true,
        },
      ],
    },
    { folderKey: "pr-7-2-2", label: "PR-7.2.2 Validação de Métodos" },
    { folderKey: "pr-7-4", label: "PR-7.4 Manuseio de Itens de Calibração" },
    { folderKey: "pr-7-6", label: "PR-7.6 Avaliação da Incerteza de Medição" },
    { folderKey: "pr-7-7", label: "PR-7.7 Garantia da Validade dos Resultados" },
    { folderKey: "pr-7-8", label: "PR-7.8 Relato de Resultados" },
    { folderKey: "pr-7-9", label: "PR-7.9 Reclamações" },
  ],
  "8": [
    { folderKey: "pr-8-3", label: "PR-8.3 Emissão e Controle de Documentos" },
    { folderKey: "pr-8-4", label: "PR-8.4 Controle de Registros" },
    { folderKey: "pr-8-5", label: "PR-8.5 Análise de Riscos e Oportunidades" },
    { folderKey: "pr-8-6-2", label: "PR-8.6.2 Monitoramento da Satisfação dos Clientes" },
    { folderKey: "pr-8-7", label: "PR-8.7 Ações Corretivas" },
    { folderKey: "pr-8-8", label: "PR-8.8 Auditorias Internas" },
    { folderKey: "pr-8-9", label: "PR-8.9 Análises Críticas pela Gerência" },
  ],
};

export function requiresFolderNav(requirementId) {
  return Object.prototype.hasOwnProperty.call(FOLDERS, String(requirementId));
}

export function getFoldersForRequirement(requirementId) {
  return FOLDERS[String(requirementId)] || [];
}

/** Atalhos opcionais sob uma pasta (ex.: coleta em PR-7.2). */
export function getFolderNavChildren(folder, { canColeta = false } = {}) {
  const list = folder?.children || [];
  return list.filter((c) => !c.requiresColeta || canColeta);
}

export function getFolderLabel(requirementId, folderKey) {
  if (!folderKey) return null;
  const row = getFoldersForRequirement(requirementId).find((f) => f.folderKey === folderKey);
  return row ? row.label : null;
}

export function getFirstFolderKey(requirementId) {
  const list = getFoldersForRequirement(requirementId);
  return list.length ? list[0].folderKey : null;
}

export function isValidFolderKey(requirementId, folderKey) {
  if (!folderKey) return false;
  return getFoldersForRequirement(requirementId).some((f) => f.folderKey === folderKey);
}

/** Rota de listagem de documentos para um requisito (com subsessão quando aplicável). */
export function buildRequirementListPath(requirementId, folderKey) {
  const rid = String(requirementId);
  if (requiresFolderNav(rid)) {
    const fk = folderKey || getFirstFolderKey(rid);
    return fk ? `/requirement/${rid}/${fk}` : `/requirement/${rid}`;
  }
  return `/requirement/${rid}`;
}
