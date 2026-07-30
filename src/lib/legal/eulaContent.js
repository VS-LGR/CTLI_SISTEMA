import { PRODUCT_NAME, RIGHTS_HOLDER, COPYRIGHT_YEAR } from "./copyright";

export const EULA_TITLE = "Termos de Adesão ao Serviço (EULA)";
export const EULA_SHORT_TITLE = "Termos de Adesão";
export const EULA_EFFECTIVE_DATE = `1 de janeiro de ${COPYRIGHT_YEAR}`;

/**
 * Termos de adesão / EULA do QualiProc.
 * Texto contratual de referência — não constitui parecer jurídico.
 */
export const EULA_SECTIONS = [
  {
    id: "aceitacao",
    title: "1. Aceitação dos termos",
    paragraphs: [
      `Ao aceder, autenticar-se ou utilizar o ${PRODUCT_NAME} (“Serviço”), o utilizador e a organização que representa (“Cliente”) declaram ter lido, compreendido e aceite estes Termos de Adesão ao Serviço (EULA), bem como a Licença de Uso associada.`,
      `Se não concordar com estes termos, não deve utilizar o Serviço.`,
    ],
  },
  {
    id: "objeto",
    title: "2. Objeto",
    paragraphs: [
      `O ${PRODUCT_NAME} é um software/serviço de gestão da qualidade disponibilizado pela ${RIGHTS_HOLDER} sob modelo de adesão contratual (SaaS ou instalação autorizada), conforme o ambiente (tenant) atribuído ao Cliente.`,
      `Estes termos regulam o uso do Serviço; condições comerciais específicas (planos, prazos, valores) podem constar de proposta, contrato ou ordem de serviço celebrados com a ${RIGHTS_HOLDER}.`,
    ],
  },
  {
    id: "conta",
    title: "3. Conta, acesso e responsabilidade do Cliente",
    paragraphs: [
      "O acesso ao Serviço exige credenciais individuais. O Cliente é responsável por manter a confidencialidade das senhas, por gerir os utilizadores do seu ambiente e por todas as atividades realizadas sob as suas contas.",
      "O Cliente deve notificar a CTLI sem demora injustificada em caso de suspeita de acesso não autorizado ou comprometimento de credenciais.",
      "Cada ambiente (tenant) e os dados nele armazenados pertencem ao Cliente titular, sem prejuízo dos direitos de propriedade intelectual da CTLI sobre o software, marcas e documentação do Serviço.",
    ],
  },
  {
    id: "uso-permitido",
    title: "4. Uso permitido",
    paragraphs: [
      `O Cliente recebe o direito limitado, não exclusivo, intransferível e não sublicenciável de utilizar o ${PRODUCT_NAME} exclusivamente para as finalidades operacionais e de qualidade da sua organização, dentro do ambiente autorizado.`,
      "É permitido o uso por colaboradores e prestadores devidamente autorizados pelo Cliente, sob a responsabilidade deste.",
    ],
  },
  {
    id: "uso-proibido",
    title: "5. Uso proibido",
    paragraphs: [
      "É expressamente proibido, salvo autorização prévia e escrita da CTLI:",
    ],
    bullets: [
      "Copiar, modificar, distribuir, vender, alugar, sublicenciar ou de outra forma explorar comercialmente o software, a interface, a documentação ou partes destes;",
      "Realizar engenharia reversa, descompilação ou tentativa de obter o código-fonte, salvo na medida em que a lei aplicável o permita de forma imperativa;",
      "Remover, ocultar ou alterar avisos de copyright, marcas ou direitos reservados da CTLI ou do QualiProc;",
      "Utilizar o Serviço de forma ilícita, fraudulenta, ou que prejudique a segurança, a disponibilidade ou a integridade do sistema ou de terceiros;",
      "Partilhar credenciais de forma indevida ou conceder acesso a pessoas não autorizadas pelo titular do ambiente.",
    ],
  },
  {
    id: "dados",
    title: "6. Dados do Cliente",
    paragraphs: [
      "Os conteúdos, registos e documentos inseridos pelo Cliente no seu ambiente permanecem sob a responsabilidade do Cliente quanto à licitude, exatidão e conservação exigível pelas normas aplicáveis à sua atividade.",
      `A ${RIGHTS_HOLDER} trata esses dados apenas na medida necessária à prestação, manutenção e suporte do Serviço, e conforme instruções ou acordos aplicáveis com o Cliente.`,
      "O Cliente é responsável por backups complementares e por políticas internas de retenção, quando aplicável ao seu contexto regulatório.",
    ],
  },
  {
    id: "disponibilidade",
    title: "7. Disponibilidade e alterações",
    paragraphs: [
      `A ${RIGHTS_HOLDER} envidará esforços razoáveis para manter o Serviço disponível, sem garantir disponibilidade ininterrupta ou isenta de erros.`,
      "Podem ocorrer manutenções, atualizações, correções e alterações de funcionalidades. Alterações materiais dos termos serão comunicadas por meios razoáveis (incluindo aviso no próprio Serviço), passando a vigorar a partir da data indicada.",
    ],
  },
  {
    id: "limitacao",
    title: "8. Limitação de garantia e responsabilidade",
    paragraphs: [
      `O Serviço é fornecido “tal como está” e “conforme disponível”, na medida permitida pela lei aplicável. A ${RIGHTS_HOLDER} não garante que o Serviço atenderá a todos os requisitos particulares do Cliente nem que estará livre de interrupções.`,
      `Na máxima extensão permitida pela lei, a ${RIGHTS_HOLDER} não responde por danos indiretos, lucros cessantes, perda de dados ou de oportunidades de negócio decorrentes do uso ou da impossibilidade de uso do Serviço, salvo dolo ou culpa grave.`,
      "Nada nestes termos exclui responsabilidade que não possa ser limitada ou excluída por lei.",
    ],
  },
  {
    id: "rescisao",
    title: "9. Suspensão e rescisão",
    paragraphs: [
      `A ${RIGHTS_HOLDER} pode suspender ou encerrar o acesso em caso de violação destes termos, de risco à segurança do Serviço, de incumprimento contratual ou de término da relação comercial.`,
      "Após o encerramento, o direito de uso cessa. A recuperação de dados do Cliente, quando aplicável, seguirá o acordo comercial ou as políticas operacionais então vigentes.",
    ],
  },
  {
    id: "pi",
    title: "10. Propriedade intelectual",
    paragraphs: [
      `O ${PRODUCT_NAME}, incluindo software, código, interfaces, documentação, nomes, logótipos e demais elementos associados, é de propriedade exclusiva da ${RIGHTS_HOLDER}. Todos os direitos estão reservados.`,
      "A adesão ao Serviço não transfere qualquer titularidade de direitos de propriedade intelectual ao Cliente — apenas a licença de uso limitada descrita nestes termos e na Licença de Uso.",
    ],
  },
  {
    id: "foro",
    title: "11. Lei aplicável e foro",
    paragraphs: [
      "Estes Termos de Adesão regem-se pelas leis da República Federativa do Brasil.",
      "Fica eleito o foro dos tribunais brasileiros competentes para dirimir controvérsias decorrentes destes termos, com renúncia a qualquer outro, por mais privilegiado que seja, na medida permitida pela lei.",
    ],
  },
  {
    id: "contato",
    title: "12. Contacto",
    paragraphs: [
      `Dúvidas sobre estes Termos de Adesão ou sobre a Licença de Uso devem ser dirigidas à ${RIGHTS_HOLDER}, titular do ${PRODUCT_NAME}.`,
    ],
  },
];
