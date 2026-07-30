import { PRODUCT_NAME, RIGHTS_HOLDER, COPYRIGHT_YEAR, getCopyrightNotice } from "./copyright";

export const LICENSE_TITLE = "Licença de Uso — Direitos Reservados";
export const LICENSE_SHORT_TITLE = "Licença";
export const LICENSE_EFFECTIVE_DATE = `1 de janeiro de ${COPYRIGHT_YEAR}`;

/**
 * Licença proprietária do QualiProc.
 * Alinhar com o ficheiro LICENSE na raiz do repositório.
 */
export const LICENSE_SECTIONS = [
  {
    id: "titularidade",
    title: "1. Titularidade",
    paragraphs: [
      `${getCopyrightNotice()}`,
      `O software ${PRODUCT_NAME}, incluindo código-fonte, código objeto, interfaces, documentação, marcas, logótipos e materiais associados, é propriedade exclusiva da ${RIGHTS_HOLDER}.`,
      "Nenhuma disposição desta licença transfere ao utilizador ou ao Cliente a titularidade de quaisquer direitos de propriedade intelectual.",
    ],
  },
  {
    id: "concessao",
    title: "2. Concessão de licença",
    paragraphs: [
      `A ${RIGHTS_HOLDER} concede ao Cliente uma licença limitada, não exclusiva, intransferível, não sublicenciável e revogável para utilizar o ${PRODUCT_NAME} exclusivamente conforme os Termos de Adesão ao Serviço (EULA) e o acordo comercial aplicável.`,
      "Esta licença autoriza apenas o uso do Serviço no ambiente (tenant) autorizado. Não autoriza cópia, redistribuição ou exploração do software fora desse âmbito.",
    ],
  },
  {
    id: "restricoes",
    title: "3. Restrições",
    paragraphs: [
      "Salvo autorização prévia e escrita da CTLI, o licenciado não pode:",
    ],
    bullets: [
      "Copiar, reproduzir, publicar ou redistribuir o software ou partes dele;",
      "Modificar, adaptar, traduzir ou criar obras derivadas;",
      "Realizar engenharia reversa, descompilação ou desmontagem, salvo quando a lei imperativa o permitir;",
      "Alugar, vender, ceder, sublicenciar ou disponibilizar o software a terceiros fora do ambiente autorizado;",
      "Remover ou alterar avisos de copyright, marcas ou “todos os direitos reservados” da CTLI;",
      "Utilizar o nome, marcas ou logótipos QualiProc ou CTLI sem autorização.",
    ],
  },
  {
    id: "reservados",
    title: "4. Todos os direitos reservados",
    paragraphs: [
      `Todos os direitos não expressamente concedidos nesta licença são reservados à ${RIGHTS_HOLDER}.`,
      `Qualquer uso não autorizado do ${PRODUCT_NAME} ou dos materiais da ${RIGHTS_HOLDER} constitui violação desta licença e pode implicar responsabilidades civis e criminais nos termos da lei aplicável.`,
    ],
  },
  {
    id: "software-terceiros",
    title: "5. Componentes de terceiros",
    paragraphs: [
      "O Serviço pode incorporar bibliotecas ou componentes de terceiros sujeitos às respetivas licenças. Esses componentes mantêm os direitos dos seus titulares; esta licença proprietária aplica-se ao software e materiais da CTLI.",
    ],
  },
  {
    id: "termino",
    title: "6. Término",
    paragraphs: [
      "Esta licença termina automaticamente em caso de violação das suas condições ou dos Termos de Adesão, ou com o encerramento do direito de uso do Serviço.",
      "Após o término, o licenciado deve cessar imediatamente todo o uso do software e destruir cópias não autorizadas que estejam sob o seu controlo, na medida aplicável.",
    ],
  },
  {
    id: "lei",
    title: "7. Lei aplicável",
    paragraphs: [
      "Esta Licença de Uso rege-se pelas leis da República Federativa do Brasil.",
    ],
  },
];

/** Texto plano alinhado ao ficheiro LICENSE do repositório. */
export function getLicenseFileText() {
  const lines = [
    `PROPRIETARY SOFTWARE LICENSE`,
    ``,
    getCopyrightNotice(),
    ``,
    `${PRODUCT_NAME} and all associated software, source code, object code,`,
    `interfaces, documentation, trademarks, and materials are the exclusive`,
    `property of ${RIGHTS_HOLDER}. All rights reserved.`,
    ``,
    `This software is licensed, not sold. Use is permitted only under the`,
    `QualiProc Terms of Service (EULA) and any applicable commercial agreement`,
    `with ${RIGHTS_HOLDER}.`,
    ``,
    `Unauthorized copying, modification, distribution, reverse engineering,`,
    `sublicensing, or removal of copyright notices is prohibited.`,
    ``,
    `All rights not expressly granted are reserved to ${RIGHTS_HOLDER}.`,
    ``,
    `Governed by the laws of the Federative Republic of Brazil.`,
  ];
  return `${lines.join("\n")}\n`;
}
