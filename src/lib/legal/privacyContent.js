import { PRODUCT_NAME, RIGHTS_HOLDER, COPYRIGHT_YEAR } from "./copyright";

export const PRIVACY_TITLE = "Política de Privacidade";
export const PRIVACY_EFFECTIVE_DATE = `15 de setembro de ${COPYRIGHT_YEAR}`;
export const PRIVACY_VERSION = "2026-09-15";

/**
 * Política de privacidade — tratamento de dados pessoais (LGPD).
 * Texto de referência operacional; não substitui parecer jurídico externo.
 */
export const PRIVACY_SECTIONS = [
  {
    id: "controlador",
    title: "1. Controlador e contacto",
    paragraphs: [
      `O controlador dos dados pessoais tratados no ${PRODUCT_NAME} é a ${RIGHTS_HOLDER}, no âmbito da prestação do serviço ao laboratório (titular do ambiente / tenant).`,
      "Pedidos de titulares (acesso, correção, portabilidade, oposição ou eliminação) devem ser dirigidos ao responsável pelo tratamento indicado no contrato do Cliente e, quando aplicável, à CTLI.",
    ],
  },
  {
    id: "bases",
    title: "2. Bases legais (Lei nº 13.709/2018)",
    paragraphs: [
      "O tratamento fundamenta-se, conforme o caso, em: execução de contrato e procedimentos preliminares (art. 7º, V); cumprimento de obrigação legal ou regulatória (art. 7º, II), incluindo requisitos de sistemas computadorizados e ISO/IEC 17025; e legítimo interesse para segurança da conta e prevenção de fraude (art. 7º, IX), observados os direitos do titular.",
      "Dados de colaboradores (identificação civil, contacto, imagem de assinatura) destinam-se à atribuição de registros e não são utilizados para marketing.",
    ],
  },
  {
    id: "dados",
    title: "3. Dados tratados",
    paragraphs: [
      "Contas: nome, e-mail, papel, ambiente. Colaboradores: identificação profissional, eventualmente CPF/RG e ficheiro de assinatura. Clientes e fornecedores: dados cadastrais (incluindo CNPJ). Registros técnicos: coletas, certificados e documentos do SGQ.",
      "O sistema regista tentativas de acesso, trilha de alterações em registros críticos e aceite de termos/privacidade.",
    ],
  },
  {
    id: "finalidade",
    title: "4. Finalidades",
    paragraphs: [
      "Autenticação, gestão do ambiente, emissão de certificados, rastreabilidade metrológica, cumprimento de SGQ e continuidade (backup).",
    ],
  },
  {
    id: "partilha",
    title: "5. Partilha e transferência",
    paragraphs: [
      "Os dados residem na infraestrutura contratada (hospedagem e base de dados). Não há venda de dados pessoais. Transferência internacional, se ocorrer na nuvem do subprocessador, segue as salvaguardas contratuais aplicáveis.",
    ],
  },
  {
    id: "retencao",
    title: "6. Retenção",
    paragraphs: [
      "Registros BPx e cópias de backup são retidos pelo prazo contratual e, no mínimo, 6 anos após a descontinuidade do sistema ou do registro, salvo prazo legal superior. Contas desativadas mantêm o identificador (não reutilização).",
    ],
  },
  {
    id: "direitos",
    title: "7. Direitos do titular",
    paragraphs: [
      "O titular pode solicitar confirmação de tratamento, acesso, correção, anonimização, portabilidade, informação sobre partilhas e revogação de consentimento quando esta for a base legal. Pedidos que colidam com retenção legal de registros de calibração serão analisados e, se recusados, fundamentados.",
    ],
  },
  {
    id: "seguranca",
    title: "8. Segurança",
    paragraphs: [
      "Acesso individual, bloqueio após tentativas falhadas, encerramento por inatividade, trilha de auditoria e desativação lógica de contas. O Cliente é responsável por gerir utilizadores do seu tenant e pela confidencialidade das senhas.",
    ],
  },
];
