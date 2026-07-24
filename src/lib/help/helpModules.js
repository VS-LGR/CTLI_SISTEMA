import { PROPOSAL_LIST_PATH } from "@/lib/commercialProposals/commercialProposalRoutes";
import { COLETA_LIST_PATH } from "@/lib/coletaRoutes";
import { CERTIFICATE_LIST_PATH } from "@/lib/certificateRoutes";
import { WEIGHT_CERTIFICATE_LIST_PATH } from "@/lib/weightCalibration/weightCertificateRoutes";
import { canAccessModule } from "@/lib/tenantAccess";
import {
  isDirectorRole,
  isFieldTechnicianRole,
  isSignatoryRole,
  canAccessCalibrationCertificates,
  canEditCalibrationCertificate,
} from "@/lib/roles";

/**
 * Catálogo de módulos com passos de tutorial / ajuda.
 * `highlight` = valor de data-tour no botão a iluminar nesta etapa.
 * `accessModule` = chave de canAccessModule.
 */
export const HELP_MODULES = [
  {
    moduleKey: "ajuda",
    title: "Ajuda",
    matchPath: (pathname) => pathname === "/ajuda" || pathname.startsWith("/ajuda/"),
    steps: [
      {
        title: "Centro de ajuda",
        body: "Aqui encontra o passo a passo de criação de cada tipo de documento e dos cadastros principais.",
        highlight: "tour-nav-help",
      },
      {
        title: "Rever um tutorial",
        body: "Em cada módulo abaixo, use “Ver tutorial” para reabrir o overlay com o botão destacado.",
        highlight: "tour-help-ver-tutorial",
      },
      {
        title: "Primeira visita",
        body: "Ao entrar pela primeira vez numa área (exceto Administrador CTLI), o sistema mostra automaticamente o tutorial desse módulo.",
      },
    ],
  },
  {
    moduleKey: "propostas",
    title: "Propostas comerciais",
    accessModule: "propostas",
    matchPath: (pathname) =>
      pathname.startsWith(PROPOSAL_LIST_PATH)
      || pathname.includes("/pr-7-1"),
    steps: [
      {
        title: "Criar nova proposta",
        body: "Comece aqui: toque no botão iluminado “Nova proposta” para abrir o formulário.",
        highlight: "tour-propostas-nova",
      },
      {
        title: "Cliente e balanças",
        body: "No formulário, selecione o cliente do cadastro e adicione balanças (pode escolher uma já cadastrada).",
      },
      {
        title: "Guardar",
        body: "Depois de preencher pontos e valor, use “Guardar” (botão azul no topo do editor).",
        highlight: "tour-propostas-guardar",
      },
      {
        title: "Gerar coleta",
        body: "Com a proposta guardada, gere a coleta de dados por balança no cartão de coletas da proposta.",
      },
    ],
  },
  {
    moduleKey: "coleta",
    title: "Coleta de dados",
    accessModule: "coleta",
    matchPath: (pathname) =>
      pathname.startsWith(COLETA_LIST_PATH)
      || (pathname.includes("/pr-7-2/") && pathname.includes("/coleta") && !pathname.includes("/pesos/")),
    steps: [
      {
        title: "Nova coleta",
        body: "Toque no botão iluminado “Nova coleta” para começar (ou abra a partir da proposta).",
        highlight: "tour-coleta-nova",
      },
      {
        title: "Cliente e balança",
        body: "Na secção 1 e 2, escolha o cliente e a balança cadastrada (ou preencha e cadastre).",
      },
      {
        title: "Ver certificados",
        body: "Quando precisar, use o botão “Certificados” para ir à lista de emissão.",
        highlight: "tour-coleta-certificados",
        requiresCertAccess: true,
      },
      {
        title: "Guardar",
        body: "Preencha os ensaios e use “Guardar”. Depois pode gerar o certificado.",
        highlight: "tour-coleta-guardar",
      },
    ],
  },
  {
    moduleKey: "certificados",
    title: "Certificados de calibração",
    accessModule: "certificados",
    matchPath: (pathname) =>
      pathname.startsWith(CERTIFICATE_LIST_PATH)
      || (pathname.includes("/pr-7-2/certificados") && !pathname.includes("/pesos/"))
      || pathname.startsWith("/aprovacao"),
    steps: [
      {
        title: "Novo certificado",
        body: "Toque no botão iluminado para criar um certificado (preferencialmente a partir de uma coleta).",
        highlight: "tour-cert-balanca-novo",
        requiresCertEdit: true,
      },
      {
        title: "Dados e cálculos",
        body: "Confirme balança, pontos e conformidade antes de avançar no workflow.",
        requiresCertEdit: true,
      },
      {
        title: "Aprovação e PDF",
        body: "Siga aprovação/assinatura e exporte o PDF quando estiver pronto.",
      },
    ],
    signatorySteps: [
      {
        title: "Painel de aprovação",
        body: "Abra a lista de certificados aguardando aprovação. O seu papel não cria certificados — apenas aprova ou reprova.",
      },
      {
        title: "Aprovar",
        body: "Revise os dados e use Aprovar quando estiver conforme.",
      },
      {
        title: "Reprovar com motivo",
        body: "Se reprovar, indique obrigatoriamente o motivo da reprovação para o técnico corrigir.",
      },
    ],
  },
  {
    moduleKey: "certificados-peso",
    title: "Certificados de peso padrão",
    accessModule: "certificados",
    matchPath: (pathname) =>
      pathname.startsWith(WEIGHT_CERTIFICATE_LIST_PATH)
      || pathname.includes("/pr-7-2/pesos/certificados"),
    steps: [
      {
        title: "Novo certificado de peso",
        body: "Toque no botão iluminado “Nova” para emitir um certificado de calibração de peso padrão.",
        highlight: "tour-cert-peso-novo",
        requiresCertEdit: true,
      },
      {
        title: "Preencher e calcular",
        body: "Complete os itens, rastreabilidade e revise os resultados calculados.",
        requiresCertEdit: true,
      },
      {
        title: "Workflow e PDF",
        body: "Avance no fluxo de aprovação e exporte o PDF do certificado.",
      },
    ],
  },
  {
    moduleKey: "cadastros",
    title: "Cadastros",
    accessModule: "cadastros",
    matchPath: (pathname) => pathname.includes("/cadastro/"),
    steps: [
      {
        title: "Onde cadastrar",
        body: "Os cadastros ficam nas pastas dos requisitos. Exemplos: clientes, balanças, pesos padrão, provedores.",
      },
      {
        title: "Cliente e balança",
        body: "Cadastre o cliente final e as balanças vinculadas — usadas em propostas, coletas e certificados.",
      },
      {
        title: "Provedores",
        body: "Cadastre provedores em PR-6.6 para pedidos de compra e solicitações de orçamento.",
      },
    ],
  },
  {
    moduleKey: "pedidos-compra",
    title: "Pedidos de compra",
    accessModule: "pedidos_compra",
    matchPath: (pathname) =>
      pathname.startsWith("/pedidos-compra")
      || (pathname.includes("/pr-6-6") && !pathname.includes("/cadastro/")),
    steps: [
      {
        title: "Criar pedido",
        body: "Abra Pedidos de compra e inicie um novo pedido com itens e provedor.",
      },
      {
        title: "Fluxo de status",
        body: "Avance aprovação técnica, envio ao provedor e recebimento conforme o workflow.",
      },
      {
        title: "Inspeção",
        body: "Registre a inspeção de recebimento e conclua o ciclo do pedido.",
      },
    ],
  },
  {
    moduleKey: "solicitacoes-orcamento",
    title: "Solicitações de orçamento",
    accessModule: "solicitacao_orcamento",
    matchPath: (pathname) => pathname.startsWith("/solicitacoes-orcamento"),
    steps: [
      {
        title: "Nova solicitação",
        body: "Crie a solicitação, escolha o provedor e descreva os itens a cotar.",
      },
      {
        title: "Envio e retorno",
        body: "Marque o envio ao provedor e registre o orçamento recebido.",
      },
      {
        title: "Converter",
        body: "Quando aplicável, converta a solicitação em pedido de compra.",
      },
    ],
  },
  {
    moduleKey: "lista-mestra",
    title: "Lista mestra",
    accessModule: "lista_mestra",
    matchPath: (pathname) =>
      pathname.startsWith("/lista-mestra")
      || pathname.includes("/pr-8-3")
      || pathname.includes("/manual-qualidade"),
    steps: [
      {
        title: "Documentos controlados",
        body: "A Lista Mestra organiza documentos internos, externos, revisões e distribuição.",
      },
      {
        title: "Consultar e gerar",
        body: "Use as abas para localizar modelos ativos e documentos gerados.",
      },
      {
        title: "Alertas",
        body: "Acompanhe alertas de validade/revisão na área correspondente.",
      },
    ],
  },
  {
    moduleKey: "dashboard",
    title: "Dashboard",
    matchPath: (pathname) => pathname === "/dashboard" || pathname === "/",
    steps: [
      {
        title: "Atalhos principais",
        body: "Use os cartões iluminados da dashboard para abrir Propostas, Coleta ou Certificados.",
        highlight: "tour-dashboard-atalhos",
      },
      {
        title: "Certificado de peso padrão",
        body: "Ambientes cliente também acedem à emissão de certificados de peso padrão (se o seu papel tiver permissão).",
        highlight: "tour-dashboard-cert-peso",
        requiresCertAccess: true,
      },
      {
        title: "Ajuda",
        body: "No canto inferior do menu, abra Ajuda para rever qualquer passo a passo.",
        highlight: "tour-nav-help",
      },
    ],
    directorSteps: [
      {
        title: "Métricas da empresa",
        body: "O dashboard mostra indicadores: provedores, clientes, certificados emitidos, propostas e receita.",
        highlight: "tour-dashboard-atalhos",
      },
      {
        title: "Gráficos",
        body: "Use os gráficos de composição e de propostas/receita para acompanhar o desempenho do ambiente.",
      },
      {
        title: "Ajuda",
        body: "No menu, abra Ajuda se quiser rever este tutorial.",
        highlight: "tour-nav-help",
      },
    ],
  },
];

export const HELP_PATH = "/ajuda";

export function resolveHelpModule(pathname) {
  if (!pathname) return null;
  return HELP_MODULES.find((m) => m.matchPath(pathname)) || null;
}

export function getHelpModuleByKey(moduleKey) {
  return HELP_MODULES.find((m) => m.moduleKey === moduleKey) || null;
}

function canSeeHelpModule(mod, { tenant, role, user }) {
  if (mod.moduleKey === "ajuda") return true;
  if (isDirectorRole(role)) return mod.moduleKey === "dashboard";
  if (isFieldTechnicianRole(role)) return mod.moduleKey === "coleta";
  if (isSignatoryRole(role)) {
    return mod.moduleKey === "certificados" || mod.moduleKey === "certificados-peso";
  }
  if (mod.moduleKey === "dashboard") return true;
  if (!mod.accessModule) return true;
  return canAccessModule({ tenant, role, module: mod.accessModule, user });
}

function adaptSteps(mod, role, user) {
  if (isDirectorRole(role) && mod.directorSteps) return mod.directorSteps;
  if (isSignatoryRole(role) && mod.signatorySteps) return mod.signatorySteps;

  const canCert = canAccessCalibrationCertificates(role, user);
  const canEdit = canEditCalibrationCertificate(role, user);

  return (mod.steps || []).filter((step) => {
    if (step.requiresCertAccess && !canCert) return false;
    if (step.requiresCertEdit && !canEdit) return false;
    return true;
  });
}

/** Módulo adaptado ao papel (passos filtrados). */
export function adaptHelpModuleForUser(mod, { tenant = null, role = null, user = null } = {}) {
  if (!mod) return null;
  if (!canSeeHelpModule(mod, { tenant, role, user })) return null;
  return {
    ...mod,
    steps: adaptSteps(mod, role, user),
  };
}

/** Módulos listados na página Ajuda (exclui a própria entrada “ajuda”). */
export function getHelpCatalogModules() {
  return HELP_MODULES.filter((m) => m.moduleKey !== "ajuda");
}

/** Catálogo filtrado pelas permissões do utilizador. */
export function getHelpCatalogModulesForUser({ tenant = null, role = null, user = null } = {}) {
  return getHelpCatalogModules()
    .map((m) => adaptHelpModuleForUser(m, { tenant, role, user }))
    .filter(Boolean)
    .filter((m) => (m.steps || []).length > 0);
}
