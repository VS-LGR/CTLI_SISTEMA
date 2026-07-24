import { PROPOSAL_LIST_PATH, PROPOSAL_NEW_PATH } from "@/lib/commercialProposals/commercialProposalRoutes";
import { COLETA_LIST_PATH, COLETA_NEW_PATH } from "@/lib/coletaRoutes";
import { CERTIFICATE_LIST_PATH, CERTIFICATE_NEW_PATH } from "@/lib/certificateRoutes";
import { WEIGHT_CERTIFICATE_LIST_PATH, WEIGHT_CERTIFICATE_NEW_PATH } from "@/lib/weightCalibration/weightCertificateRoutes";
import { APPROVAL_HUB_PATH } from "@/lib/approvalRoutes";
import { PEDIDOS_LIST_PATH } from "@/lib/pedidosCompraRoutes";
import { QUOTATION_LIST_PATH } from "@/lib/quotationRequestsRoutes";
import { LISTA_MESTRA_PATH } from "@/lib/masterDocuments/masterDocumentRoutes";
import { cadastroSectionPath } from "@/lib/cadastroSections";
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
 * `highlight` = valor de data-tour no botão a iluminar (obrigatório em cada passo).
 * `tourPath` = rota onde os botões com data-tour existem (navegação ao reabrir o tour).
 */
export const HELP_MODULES = [
  {
    moduleKey: "ajuda",
    title: "Ajuda",
    tourPath: "/ajuda",
    matchPath: (pathname) => pathname === "/ajuda" || pathname.startsWith("/ajuda/"),
    steps: [
      {
        title: "Centro de ajuda",
        body: "Aqui encontra o passo a passo de criação de cada tipo de documento e dos cadastros principais.",
        highlight: "tour-nav-help",
      },
      {
        title: "Rever um tutorial",
        body: "Em cada módulo abaixo, use “Ver tutorial” para ir à página e ver o botão real iluminado.",
        highlight: "tour-help-ver-tutorial",
      },
    ],
  },
  {
    moduleKey: "propostas",
    title: "Propostas comerciais",
    accessModule: "propostas",
    tourPath: PROPOSAL_LIST_PATH,
    matchPath: (pathname) =>
      pathname.startsWith(PROPOSAL_LIST_PATH)
      || (pathname.includes("/pr-7-1") && !pathname.includes("/cadastro/")),
    steps: [
      {
        title: "Criar nova proposta",
        body: "Toque no botão iluminado “Nova proposta” para abrir o formulário.",
        highlight: "tour-propostas-nova",
      },
      {
        title: "Preencher e guardar",
        body: "No formulário, selecione o cliente, adicione balanças e use “Guardar” (botão azul no topo).",
        highlight: "tour-propostas-guardar",
        tourPath: PROPOSAL_NEW_PATH,
      },
    ],
  },
  {
    moduleKey: "coleta",
    title: "Coleta de dados",
    accessModule: "coleta",
    tourPath: COLETA_LIST_PATH,
    matchPath: (pathname) =>
      pathname.startsWith(COLETA_LIST_PATH)
      || (pathname.includes("/pr-7-2/") && pathname.includes("/coleta") && !pathname.includes("/pesos/")),
    steps: [
      {
        title: "Nova coleta",
        body: "Toque no botão iluminado “Nova coleta” para começar.",
        highlight: "tour-coleta-nova",
      },
      {
        title: "Ver certificados",
        body: "Quando precisar, use o botão “Certificados” para ir à lista de emissão.",
        highlight: "tour-coleta-certificados",
        requiresCertAccess: true,
      },
      {
        title: "Guardar a coleta",
        body: "No editor, preencha os ensaios e use o botão iluminado “Guardar”.",
        highlight: "tour-coleta-guardar",
        tourPath: COLETA_NEW_PATH,
      },
    ],
  },
  {
    moduleKey: "certificados",
    title: "Certificados de calibração",
    accessModule: "certificados",
    tourPath: CERTIFICATE_LIST_PATH,
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
        title: "Lista e workflow",
        body: "Na lista, abra um certificado para calcular, enviar para aprovação e emitir o PDF.",
        highlight: "tour-cert-balanca-lista",
        requiresCertEdit: true,
      },
    ],
    signatorySteps: [
      {
        title: "Painel de aprovação",
        body: "Este é o painel de aprovação. O seu papel não cria certificados — apenas aprova ou reprova.",
        highlight: "tour-aprovacao-hub",
        tourPath: APPROVAL_HUB_PATH,
      },
      {
        title: "Aba balanças",
        body: "Use a aba iluminada para ver certificados de balança aguardando aprovação.",
        highlight: "tour-aprovacao-tab-balancas",
        tourPath: APPROVAL_HUB_PATH,
      },
      {
        title: "Aba pesos",
        body: "Use a aba iluminada para certificados de peso padrão. Ao reprovar, o motivo é obrigatório.",
        highlight: "tour-aprovacao-tab-pesos",
        tourPath: APPROVAL_HUB_PATH,
      },
    ],
  },
  {
    moduleKey: "certificados-peso",
    title: "Certificados de peso padrão",
    accessModule: "certificados",
    tourPath: WEIGHT_CERTIFICATE_LIST_PATH,
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
        title: "Lista de certificados",
        body: "Na lista iluminada, abra um certificado para calcular, aprovar e exportar o PDF.",
        highlight: "tour-cert-peso-lista",
        requiresCertEdit: true,
      },
    ],
  },
  {
    moduleKey: "cadastros",
    title: "Cadastros",
    accessModule: "cadastros",
    tourPath: cadastroSectionPath("clientes"),
    matchPath: (pathname) => pathname.includes("/cadastro/"),
    steps: [
      {
        title: "Cadastrar cliente",
        body: "Use o botão iluminado “Novo cliente” para adicionar um cliente final do ambiente.",
        highlight: "tour-cadastro-novo",
      },
      {
        title: "Balanças e provedores",
        body: "No mesmo estilo, em PR-7.1 abre o cadastro de Balanças e em PR-6.6 o de Provedores — cada secção tem o seu botão “Novo”.",
        highlight: "tour-cadastro-novo",
      },
      {
        title: "Ajuda",
        body: "Pode rever este e outros tutoriais a qualquer momento em Ajuda, no fundo do menu.",
        highlight: "tour-nav-help",
      },
    ],
  },
  {
    moduleKey: "pedidos-compra",
    title: "Pedidos de compra",
    accessModule: "pedidos_compra",
    tourPath: PEDIDOS_LIST_PATH,
    matchPath: (pathname) =>
      pathname.startsWith("/pedidos-compra")
      || (pathname.includes("/pr-6-6") && !pathname.includes("/cadastro/")),
    steps: [
      {
        title: "Criar pedido",
        body: "Toque no botão iluminado “Novo pedido” para iniciar um pedido com itens e provedor.",
        highlight: "tour-pedidos-novo",
      },
      {
        title: "Lista de pedidos",
        body: "Acompanhe o workflow (aprovação, envio, recebimento e inspeção) na lista iluminada.",
        highlight: "tour-pedidos-lista",
      },
    ],
  },
  {
    moduleKey: "solicitacoes-orcamento",
    title: "Solicitações de orçamento",
    accessModule: "solicitacao_orcamento",
    tourPath: QUOTATION_LIST_PATH,
    matchPath: (pathname) => pathname.startsWith("/solicitacoes-orcamento"),
    steps: [
      {
        title: "Nova solicitação",
        body: "Toque no botão iluminado para criar a solicitação e escolher o provedor.",
        highlight: "tour-orcamento-nova",
      },
      {
        title: "Lista de solicitações",
        body: "Na lista, avance envio, retorno do orçamento e conversão em pedido de compra.",
        highlight: "tour-orcamento-lista",
      },
    ],
  },
  {
    moduleKey: "lista-mestra",
    title: "Lista mestra",
    accessModule: "lista_mestra",
    tourPath: LISTA_MESTRA_PATH,
    matchPath: (pathname) =>
      pathname.startsWith("/lista-mestra")
      || pathname.includes("/pr-8-3")
      || pathname.includes("/manual-qualidade"),
    steps: [
      {
        title: "Documentos controlados",
        body: "A Lista Mestra organiza documentos internos, externos, revisões e distribuição. Use a área iluminada.",
        highlight: "tour-lista-mestra",
      },
      {
        title: "Ajuda",
        body: "Pode rever este e outros tutoriais a qualquer momento em Ajuda.",
        highlight: "tour-nav-help",
      },
    ],
  },
  {
    moduleKey: "dashboard",
    title: "Dashboard",
    tourPath: "/dashboard",
    matchPath: (pathname) => pathname === "/dashboard" || pathname === "/",
    steps: [
      {
        title: "Atalhos principais",
        body: "Use os cartões iluminados da dashboard para abrir Propostas, Coleta ou Certificados.",
        highlight: "tour-dashboard-atalhos",
      },
      {
        title: "Certificado de peso padrão",
        body: "O atalho iluminado abre a emissão de certificados de peso padrão (se o seu papel tiver permissão).",
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
        title: "Indicadores",
        body: "Os cartões iluminados mostram provedores, clientes, certificados, propostas e receita.",
        highlight: "tour-diretor-kpis",
      },
      {
        title: "Gráficos",
        body: "Os gráficos iluminados mostram a composição do ambiente e propostas/receita no tempo.",
        highlight: "tour-diretor-graficos",
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

/** Rota onde o passo deve ser mostrado (highlight presente no DOM). */
export function getTourPathForStep(module, step) {
  return step?.tourPath || module?.tourPath || "/dashboard";
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
