/**
 * Observações legais do certificado RE-7.2B — transcritas do modelo matriz RBC.
 * Rastreável: mesma estrutura, sem referências a acreditação/CGCRE.
 */

export function getRbcObservations() {
  return [
    "A calibração foi realizada nas instalações do Cliente. Este certificado é válido apenas para a balança calibrada. Uma cópia deste certificado será arquivada por cinco anos.",
    "Este certificado só poderá ser usado para fins publicitários e/ou promocionais quando autorizado pelo laboratório emissor.",
    "A incerteza expandida de medição relatada é declarada como a incerteza padrão da medição multiplicada pelo fator de abrangência k, o qual para uma distribuição t com Veff igual ao respectivo número de graus de liberdade efetivos que corresponde a uma probabilidade de abrangência de 95,45%. A incerteza padrão de medição foi determinada de acordo com a publicação EA-4/02. A calibração foi realizada utilizando peso padrão rastreáveis ao Sistema Internacional de Unidades.",
    "Este Certificado de Calibração atende aos requisitos da NBR ISO/IEC 17025:2017.",
    "A calibração foi realizada pelo método de comparação direta, conforme procedimento interno PR-7.2 Calibração de Balanças.",
    "Esta calibração não isenta a balança do controle estabelecido da Regulamentação Metrológica.",
    "Pontos de Calibração estão de acordo com o cliente.",
  ];
}

export function getRastreavelObservations() {
  return [
    "A calibração foi realizada nas instalações do Cliente. Este certificado é válido apenas para a balança calibrada. Uma cópia deste certificado será arquivada por cinco anos.",
    "Este certificado só poderá ser usado para fins publicitários e/ou promocionais quando autorizado pelo laboratório emissor.",
    "A incerteza expandida de medição relatada é declarada como a incerteza padrão da medição multiplicada pelo fator de abrangência k, o qual para uma distribuição t com Veff igual ao respectivo número de graus de liberdade efetivos que corresponde a uma probabilidade de abrangência de 95,45%. A incerteza padrão de medição foi determinada de acordo com a publicação EA-4/02. A calibração foi realizada utilizando peso padrão rastreáveis ao Sistema Internacional de Unidades.",
    "Calibração rastreável a padrões nacionais/internacionais — sem símbolo de acreditação.",
    "A calibração foi realizada pelo método de comparação direta, conforme procedimento interno PR-7.2 Calibração de Balanças.",
    "Esta calibração não isenta a balança do controle estabelecido da Regulamentação Metrológica.",
    "Pontos de Calibração estão de acordo com o cliente.",
  ];
}

export function getCertificateObservations(certificateType) {
  return certificateType === "rbc" ? getRbcObservations() : getRastreavelObservations();
}
