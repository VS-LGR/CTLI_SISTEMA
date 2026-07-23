import { PROPOSAL_LIST_PATH } from "@/lib/commercialProposals/commercialProposalRoutes";
import { COLETA_LIST_PATH } from "@/lib/coletaRoutes";
import { CERTIFICATE_LIST_PATH } from "@/lib/certificateRoutes";

/**
 * Catálogo de módulos com passos de tutorial / ajuda.
 * `matchPath` identifica a página atual; o primeiro match na ordem do array ganha.
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
      },
      {
        title: "Rever um tutorial",
        body: "Em cada módulo, use “Ver tutorial” para reabrir o overlay explicativo na página correspondente.",
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
    matchPath: (pathname) =>
      pathname.startsWith(PROPOSAL_LIST_PATH)
      || pathname.includes("/pr-7-1"),
    steps: [
      {
        title: "Abrir propostas",
        body: "Acesse Propostas (PR-7.1) pela lista ou pelo menu. Use “Nova proposta” para começar.",
      },
      {
        title: "Cliente e balanças",
        body: "Selecione o cliente do cadastro (ou preencha o snapshot). Adicione balanças — pode escolher uma já cadastrada ou preencher e cadastrar depois.",
      },
      {
        title: "Pontos e valor",
        body: "Indique pontos de calibração solicitados, unidade e valor unitário. Guarde a proposta.",
      },
      {
        title: "Próximos passos",
        body: "Exporte para cadastro (cliente/balanças) e gere a coleta de dados por balança quando estiver pronto.",
      },
    ],
  },
  {
    moduleKey: "coleta",
    title: "Coleta de dados",
    matchPath: (pathname) =>
      pathname.startsWith(COLETA_LIST_PATH)
      || (pathname.includes("/pr-7-2/") && pathname.includes("/coleta")),
    steps: [
      {
        title: "Nova coleta",
        body: "Crie uma coleta em branco ou a partir de uma balança da proposta (dados pré-preenchidos).",
      },
      {
        title: "Cliente e balança",
        body: "Vincule o cliente e selecione uma balança cadastrada ou preencha manualmente. Pode cadastrar a balança no cliente após o preenchimento.",
      },
      {
        title: "Ensaios",
        body: "Preencha ambiente, excentricidade, pontos de calibração (com pesos padrão) e o verso quando aplicável.",
      },
      {
        title: "Guardar e avançar",
        body: "Guarde a coleta. Quando conferida, gere o certificado de calibração a partir desta página.",
      },
    ],
  },
  {
    moduleKey: "certificados",
    title: "Certificados de calibração",
    matchPath: (pathname) =>
      pathname.startsWith(CERTIFICATE_LIST_PATH)
      || pathname.includes("/pr-7-2/certificados")
      || pathname.includes("/pr-7-2/pesos/certificados")
      || pathname.startsWith("/aprovacao"),
    steps: [
      {
        title: "Origem do certificado",
        body: "O caminho recomendado é gerar a partir de uma coleta concluída. Também existe emissão manual quando necessário.",
      },
      {
        title: "Dados da balança",
        body: "Confirme o vínculo à balança cadastrada (tolerâncias e casas decimais vêm do cadastro quando ligado).",
      },
      {
        title: "Cálculos e conformidade",
        body: "Revise pontos calculados, padrões e declaração de conformidade antes de avançar no fluxo.",
      },
      {
        title: "Aprovação e PDF",
        body: "Siga o workflow até aprovação/assinatura e exporte o PDF do certificado.",
      },
    ],
  },
  {
    moduleKey: "cadastros",
    title: "Cadastros",
    matchPath: (pathname) => pathname.includes("/cadastro/"),
    steps: [
      {
        title: "Onde cadastrar",
        body: "Os cadastros ficam nas pastas dos requisitos (atalhos “Cadastros”). Exemplos: clientes, balanças, pesos padrão, provedores.",
      },
      {
        title: "Cliente e balança",
        body: "Cadastre o cliente final e, em seguida, as balanças vinculadas a ele — usadas em propostas, coletas e certificados.",
      },
      {
        title: "Padrões e sensores",
        body: "Mantenha pesos padrão, certificados de peso e termo-baro-higrômetros atualizados para as coletas.",
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
    matchPath: (pathname) =>
      pathname.startsWith("/pedidos-compra")
      || pathname.includes("/pr-6-6"),
    steps: [
      {
        title: "Criar pedido",
        body: "Abra Pedidos de compra e inicie um novo pedido com itens e provedor.",
      },
      {
        title: "Fluxo de status",
        body: "Avance aprovação técnica, envio ao provedor e recebimento conforme o workflow do documento.",
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
        body: "Use as abas para localizar modelos ativos e documentos gerados. Mantenha revisões alinhadas ao procedimento.",
      },
      {
        title: "Alertas",
        body: "Acompanhe alertas de validade/revisão na área correspondente da Lista Mestra.",
      },
    ],
  },
  {
    moduleKey: "dashboard",
    title: "Dashboard",
    matchPath: (pathname) => pathname === "/dashboard" || pathname === "/",
    steps: [
      {
        title: "Bem-vindo",
        body: "A dashboard resume atalhos e estado do seu ambiente. Use o menu lateral para abrir cada módulo.",
      },
      {
        title: "Fluxo típico",
        body: "Proposta → Coleta → Certificado. Cadastre clientes e balanças antes ou durante o processo.",
      },
      {
        title: "Ajuda sempre disponível",
        body: "No canto inferior do menu, abra Ajuda para rever qualquer passo a passo.",
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

/** Módulos listados na página Ajuda (exclui a própria entrada “ajuda”). */
export function getHelpCatalogModules() {
  return HELP_MODULES.filter((m) => m.moduleKey !== "ajuda");
}
