/**
 * Navegação por requisito (4–8) e subsessões (pastas) para 5–8.
 * Conteúdo editável aqui; rotas usam folderKey na URL (sem dois-pontos).
 */

import { COLETA_LIST_PATH, COLETA_REQ_ID, COLETA_FOLDER_KEY } from "./coletaRoutes";
import { CERTIFICATE_LIST_PATH, CERTIFICATE_NEW_PATH } from "./certificateRoutes";
import { PERSONNEL_LISTAS_PATH } from "./personnelRoutes";
import { RE_71A_CONFIG_PATH } from "./masterDocuments/masterDocumentRoutes";
import { DEVICE_SHEET_LIST_PATH } from "./deviceTechnicalSheetRoutes";
import { EQUIPMENT_VERIFICATION_LIST_PATH } from "./equipmentVerificationRoutes";
import { cadastroSectionPath } from "./cadastroSections";
import { getFolderDocumentMode, getVisibleSections } from "./documentFolderConfig";
import { canAccessRequirement, canAccessRequirementFolder, canAccessCadastroSection } from "./tenantAccess";
import { isCtliAdmin } from "./roles";

export const REQ_NAMES = {
  "4": "Requisitos Gerais",
  "5": "Requisitos De Estrutura",
  "6": "Requisitos De Recurso",
  "7": "Requisitos De Processo",
  "8": "Requisitos De Gestão",
};

/** Itens de menu principal (sidebar) — id alinhado à API `requirement`. */
export const REQ_MENU_ITEMS = [
  { id: "4", name: "Gerais", label: "Requisitos Gerais" },
  { id: "5", name: "Estrutura", label: "Requisitos De Estrutura" },
  { id: "6", name: "Recurso", label: "Requisitos De Recurso" },
  { id: "7", name: "Processo", label: "Requisitos De Processo" },
  { id: "8", name: "Gestão", label: "Requisitos De Gestão" },
];

const FOLDERS = {
  "4": [
    { folderKey: "pr-4-1", label: "PR-4.1 Confidencialidade e Imparcialidade" },
  ],
  "5": [
    { folderKey: "manual-qualidade", label: "Manual da Qualidade" },
    { folderKey: "politica-qualidade", label: "Política da Qualidade" },
    { folderKey: "documentacao-legal", label: "Documentação Legal" },
    { folderKey: "estrutura-organizacional", label: "Estrutura Organizacional" },
    { folderKey: "assinaturas", label: "Assinaturas" },
  ],
  "6": [
    {
      folderKey: "pr-6-2",
      label: "PR-6.2 Pessoal",
      children: [
        {
          key: "pessoal-listas",
          label: "Níveis e Listas Padrão",
          to: PERSONNEL_LISTAS_PATH,
          requiresPersonnelStandardOptions: true,
        },
        {
          key: "cad-colaboradores",
          label: "Colaboradores",
          to: cadastroSectionPath("colaboradores"),
          cadastroSectionId: "colaboradores",
          kind: "cadastro",
        },
        {
          key: "cad-tecnicos",
          label: "Técnicos de campo",
          to: cadastroSectionPath("tecnicos"),
          cadastroSectionId: "tecnicos",
          requiresTechnicians: true,
          kind: "cadastro",
        },
      ],
    },
    { folderKey: "pr-6-4", label: "PR-6.4 Equipamentos",
      children: [
        {
          key: "cad-cert-peso",
          label: "Certificados de Calibração dos Equipamentos",
          to: cadastroSectionPath("cert-peso"),
          cadastroSectionId: "cert-peso",
          kind: "cadastro",
        },
        {
          key: "cad-pesos",
          label: "Peso Padrão",
          to: cadastroSectionPath("pesos"),
          cadastroSectionId: "pesos",
          kind: "cadastro",
        },
        {
          key: "cad-thermo",
          label: "Termobarohigrômetro",
          to: cadastroSectionPath("thermo"),
          cadastroSectionId: "thermo",
          kind: "cadastro",
        },
      ],
    },
    { folderKey: "pr-6-4-10", label: "PR-6.4.10 Checagens Intermediárias" },
    { folderKey: "pr-6-4-12", label: "PR-6.4.12 Manutenção de Equipamentos" },
    { folderKey: "pr-6-5", label: "PR-6.5 Rastreabilidade Metrológica" },
    { folderKey: "pr-6-6", label: "PR-6.6 Produtos e Serviços Providos Externamente",
      children: [
        {
          key: "cad-fornecedores",
          label: "Fornecedores",
          to: cadastroSectionPath("fornecedores"),
          cadastroSectionId: "fornecedores",
          kind: "cadastro",
        },
      ],
    },
  ],
  "7": [
    { folderKey: "pr-7-1", label: "PR-7.1 Análise Crítica de Pedidos, Propostas e Contratos",
      children: [
        {
          key: "cad-clientes",
          label: "Clientes",
          to: cadastroSectionPath("clientes"),
          cadastroSectionId: "clientes",
          kind: "cadastro",
        },
        {
          key: "cad-balancas",
          label: "Balanças",
          to: cadastroSectionPath("balancas"),
          cadastroSectionId: "balancas",
          kind: "cadastro",
        },
        {
          key: "config-re-71a",
          label: "Configurações da Proposta",
          to: RE_71A_CONFIG_PATH,
          requiresCtliAdmin: true,
        },
      ],
    },
    { folderKey: "pr-7-1-7", label: "PR-7.1.7 Atendimento ao Cliente" },
    { folderKey: "pr-7-10", label: "PR-7.10 Trabalho Não Conforme" },
    { folderKey: "pr-7-11", label: "PR-7.11 Controle de Dados e Gestão da Informação" },
    {
      folderKey: "pr-7-2",
      label: "PR-7.2 Calibração de Balanças",
    },
    { folderKey: "pr-7-2-2", label: "PR-7.2.2 Validação de Métodos" },
    { folderKey: "pr-7-4", label: "PR-7.4 Manuseio de Itens de Calibração" },
    { folderKey: "pr-7-6", label: "PR-7.6 Avaliação da Incerteza de Medição" },
    { folderKey: "pr-7-7", label: "PR-7.7 Garantia da Validade dos Resultados" },
    { folderKey: "pr-7-8", label: "PR-7.8 Relato de Resultados" },
    { folderKey: "pr-7-9", label: "PR-7.9 Reclamações" },
  ],
  "8": [
    {
      folderKey: "pr-8-3",
      label: "PR-8.3 Emissão e Controle de Documentos",
    },

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

export function getFoldersForRequirement(requirementId, tenant = null, role = null) {
  const all = FOLDERS[String(requirementId)] || [];
  if (!tenant || !role || isCtliAdmin(role)) return all;
  return all.filter((f) => canAccessRequirementFolder({
    tenant,
    role,
    requirementId,
    folderKey: f.folderKey,
  }));
}

/** Itens de menu principal (sidebar) filtrados por modelo de ambiente. */
export function getVisibleReqMenuItems(tenant = null, role = null) {
  if (!tenant || !role) return REQ_MENU_ITEMS;
  return REQ_MENU_ITEMS.filter((r) => canAccessRequirement({ tenant, role, requirementId: r.id }));
}

/** Atalhos operacionais dentro da pasta (ex.: coleta, certificados, fichas, cadastros). */
export function getFolderNavChildren(folder, {
  canColeta = false,
  canPersonnelStandardOptions = false,
  canMasterDocuments = false,
  canCalibrationCertificates = false,
  canCommercialProposals = false,
  canCtliAdmin = false,
  canTechnicians = false,
  tenant = null,
  role = null,
  user = null,
} = {}) {
  const list = folder?.children || [];
  return list.filter((c) => {
    if (c.requiresCtliAdmin && !canCtliAdmin) return false;
    if (c.requiresColeta && !canColeta) return false;
    if (c.requiresCalibrationCertificates && !canCalibrationCertificates) return false;
    if (c.requiresPersonnelStandardOptions && !canPersonnelStandardOptions) return false;
    if (c.requiresMasterDocuments && !canMasterDocuments) return false;
    if (c.requiresCommercialProposals && !canCommercialProposals) return false;
    if (c.requiresTechnicians && !canTechnicians) return false;
    if (c.cadastroSectionId && tenant && role) {
      return canAccessCadastroSection({ tenant, role, sectionId: c.cadastroSectionId, user });
    }
    return true;
  });
}

/** Secções documentais (Procedimentos, Registros, …) — usadas nas abas da página do PR, não no menu lateral. */
export function buildFolderSidebarNav(requirementId, folder, { canColeta = false, canPersonnelStandardOptions = false, canMasterDocuments = false, canCalibrationCertificates = false, canCommercialProposals = false, canCtliAdmin = false } = {}) {
  const rid = String(requirementId);
  const fk = folder?.folderKey;
  if (!fk) return [];

  const mode = getFolderDocumentMode(rid, fk);
  const sections = mode.hideSectionNav ? [] : getVisibleSections(rid, fk);
  const base = buildRequirementListPath(rid, fk);

  const sectionItems = sections.map((section) => ({
    key: `section-${section.id}`,
    label: section.label,
    to: `${base}?tab=${section.id}`,
    kind: "section",
    sectionId: section.id,
    folderDefaultSection: mode.defaultSection,
  }));

  const extras = getFolderNavChildren(folder, { canColeta, canPersonnelStandardOptions, canMasterDocuments, canCalibrationCertificates, canCommercialProposals, canCtliAdmin });
  return [...sectionItems, ...extras];
}

export function folderHasSidebarNav(requirementId, folder) {
  return buildFolderSidebarNav(requirementId, folder).length > 0;
}

export function getFolderLabel(requirementId, folderKey, tenant = null, role = null) {
  if (!folderKey) return null;
  const row = getFoldersForRequirement(requirementId, tenant, role).find((f) => f.folderKey === folderKey);
  return row ? row.label : null;
}

export function getFirstFolderKey(requirementId, tenant = null, role = null) {
  const list = getFoldersForRequirement(requirementId, tenant, role);
  return list.length ? list[0].folderKey : null;
}

export function isValidFolderKey(requirementId, folderKey, tenant = null, role = null) {
  if (!folderKey) return false;
  return getFoldersForRequirement(requirementId, tenant, role).some((f) => f.folderKey === folderKey);
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

/** Verifica se pathname está num submódulo operacional de pastas do req 6/7. */
export function isPr72OperationalPath(pathname) {
  if (!pathname) return false;
  if (pathname.startsWith(DEVICE_SHEET_LIST_PATH)) return true;
  if (pathname.startsWith(EQUIPMENT_VERIFICATION_LIST_PATH)) return true;
  const base = `/requirement/${COLETA_REQ_ID}/${COLETA_FOLDER_KEY}`;
  return pathname.startsWith(`${base}/coleta`) || pathname.startsWith(`${base}/certificados`);
}

export { CERTIFICATE_LIST_PATH, CERTIFICATE_NEW_PATH, COLETA_LIST_PATH };
