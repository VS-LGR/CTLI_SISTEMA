/** ACL granular por conta — helpers puros (sem imports de tenantAccess/nav para evitar ciclos). */

export const ACL_VERSION = 1;

/** Módulos operacionais selecionáveis na UI. */
export const ACL_OPERATIONAL_MODULES = [
  { id: "coleta", label: "Coleta de dados" },
  { id: "propostas", label: "Propostas comerciais" },
  { id: "certificados", label: "Certificados de calibração" },
  { id: "pedidos_compra", label: "Pedidos de compra" },
  { id: "solicitacao_orcamento", label: "Solicitações de orçamento" },
  { id: "lista_mestra", label: "Lista mestra" },
  { id: "cadastros", label: "Cadastros" },
  { id: "pessoal", label: "Pessoal (níveis e listas)" },
];

const ALLOWED_MODULE_IDS = new Set(ACL_OPERATIONAL_MODULES.map((m) => m.id));

const REQ_LABELS = {
  "4": "Requisitos Gerais",
  "5": "Requisitos De Estrutura",
  "6": "Requisitos De Recurso",
  "7": "Requisitos De Processo",
  "8": "Requisitos De Gestão",
};

/** Catálogo de pastas por requisito (espelha requirementNavConfig FOLDERS). */
const FOLDER_CATALOG = {
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
    { folderKey: "pr-7-2", label: "PR-7.2 Calibração de Balanças" },
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

const ALLOWED_FOLDER_KEYS = new Set(
  Object.values(FOLDER_CATALOG).flatMap((list) => list.map((f) => f.folderKey)),
);

/** Mapa secção de cadastro → pasta PR pai. */
const CADASTRO_SECTION_FOLDER = {
  fornecedores: { reqId: "6", folderKey: "pr-6-6" },
  clientes: { reqId: "7", folderKey: "pr-7-1" },
  colaboradores: { reqId: "6", folderKey: "pr-6-2" },
  "cert-peso": { reqId: "6", folderKey: "pr-6-4" },
  pesos: { reqId: "6", folderKey: "pr-6-4" },
  balancas: { reqId: "7", folderKey: "pr-7-1" },
  thermo: { reqId: "6", folderKey: "pr-6-4" },
  tecnicos: { reqId: "6", folderKey: "pr-6-2" },
};

/** ACL ativa (gravada na UI) — distingue legado `{}`. */
export function isAclActive(acl) {
  if (!acl || typeof acl !== "object") return false;
  return Number(acl.version) === ACL_VERSION;
}

export function emptyAccessAcl() {
  return { version: ACL_VERSION, modules: [], folders: {} };
}

/**
 * Normaliza e valida payload ACL (whitelist de módulos/pastas).
 */
export function normalizeAccessAcl(raw, { activate = true } = {}) {
  if (!activate && (!raw || typeof raw !== "object" || Number(raw.version) !== ACL_VERSION)) {
    return {};
  }

  const modulesIn = Array.isArray(raw?.modules) ? raw.modules : [];
  const modules = [...new Set(
    modulesIn
      .map((m) => String(m || "").trim())
      .filter((m) => ALLOWED_MODULE_IDS.has(m)),
  )].sort();

  const foldersIn = raw?.folders && typeof raw.folders === "object" ? raw.folders : {};
  const folders = {};
  Object.keys(foldersIn).forEach((reqId) => {
    const rid = String(reqId);
    if (!REQ_LABELS[rid]) return;
    const list = Array.isArray(foldersIn[reqId]) ? foldersIn[reqId] : [];
    const keys = [...new Set(
      list
        .map((k) => String(k || "").trim())
        .filter((k) => ALLOWED_FOLDER_KEYS.has(k)),
    )].sort();
    if (keys.length) folders[rid] = keys;
  });

  return { version: ACL_VERSION, modules, folders };
}

export function aclAllowsModule(acl, moduleId) {
  if (!isAclActive(acl) || !moduleId) return false;
  const id = String(moduleId);
  if (id.startsWith("req") && id.length === 4) {
    const rid = id.slice(3);
    return aclAllowsRequirement(acl, rid);
  }
  if (id === "thermo" || id === "pesos" || id === "balancas") {
    return (acl.modules || []).includes("cadastros") || (acl.modules || []).includes(id);
  }
  return (acl.modules || []).includes(id);
}

export function aclAllowsRequirement(acl, requirementId) {
  if (!isAclActive(acl)) return false;
  const rid = String(requirementId);
  const list = acl.folders?.[rid];
  return Array.isArray(list) && list.length > 0;
}

export function aclAllowsFolder(acl, requirementId, folderKey) {
  if (!isAclActive(acl) || !folderKey) return false;
  const rid = String(requirementId);
  const list = acl.folders?.[rid];
  if (!Array.isArray(list)) return false;
  return list.includes(String(folderKey));
}

export function aclAllowsCadastroSection(acl, sectionId) {
  if (!isAclActive(acl)) return false;
  if (!(acl.modules || []).includes("cadastros")) return false;
  const meta = CADASTRO_SECTION_FOLDER[sectionId];
  if (!meta) return false;
  return aclAllowsFolder(acl, meta.reqId, meta.folderKey);
}

export function accessFlagsFromAcl(acl) {
  if (!isAclActive(acl)) {
    return { access_coleta: false, access_certificados: false };
  }
  return {
    access_coleta: (acl.modules || []).includes("coleta"),
    access_certificados: (acl.modules || []).includes("certificados"),
  };
}

export function getAccessAclCatalog() {
  const requirements = Object.keys(REQ_LABELS).map((id) => ({
    id,
    label: REQ_LABELS[id],
    folders: FOLDER_CATALOG[id] || [],
  }));
  return {
    modules: ACL_OPERATIONAL_MODULES,
    requirements,
  };
}

export function presetAccessAclForRole(role) {
  const acl = emptyAccessAcl();
  if (!role || role === "admin") return acl;

  if (role === "tecnico_campo") {
    acl.modules = ["coleta"];
    return acl;
  }
  if (role === "signatario") {
    acl.modules = ["certificados"];
    return acl;
  }
  if (role === "diretor") {
    return acl;
  }

  const allFoldersFor = (reqIds) => {
    reqIds.forEach((rid) => {
      const keys = (FOLDER_CATALOG[rid] || []).map((f) => f.folderKey);
      if (keys.length) acl.folders[rid] = keys;
    });
  };

  if (role === "gerente_geral" || role === "client") {
    allFoldersFor(["4", "5", "6", "7", "8"]);
    acl.modules = ACL_OPERATIONAL_MODULES.map((m) => m.id);
    return normalizeAccessAcl(acl);
  }

  if (role === "gerente_qualidade") {
    allFoldersFor(["4", "6", "8"]);
    acl.modules = ["lista_mestra", "cadastros", "pessoal", "coleta", "certificados"];
    return normalizeAccessAcl(acl);
  }

  if (role === "gerente_tecnico") {
    allFoldersFor(["7"]);
    acl.modules = ["coleta", "propostas", "certificados", "cadastros"];
    return normalizeAccessAcl(acl);
  }

  if (role === "administrativo_vendas") {
    acl.folders = { "7": ["pr-7-1", "pr-7-1-7"] };
    acl.modules = ["propostas", "cadastros", "coleta", "certificados"];
    return normalizeAccessAcl(acl);
  }

  if (role === "administrativo_compras") {
    acl.folders = { "6": ["pr-6-6"] };
    acl.modules = ["pedidos_compra", "solicitacao_orcamento", "cadastros"];
    return normalizeAccessAcl(acl);
  }

  return normalizeAccessAcl(acl);
}

export function aclAllowedRequirementPathPrefixes(acl) {
  if (!isAclActive(acl)) return [];
  const prefixes = [];
  Object.entries(acl.folders || {}).forEach(([rid, keys]) => {
    (keys || []).forEach((fk) => {
      prefixes.push(`/requirement/${rid}/${fk}`);
    });
  });
  return prefixes;
}
