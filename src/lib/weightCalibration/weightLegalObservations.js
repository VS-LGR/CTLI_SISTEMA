/**
 * Observações legais do certificado RE-5.4.2B (pesos-padrão).
 * Alinhadas ao PR-7.2 Rev.06 — Calibração de Pesos (NBR ISO/IEC 17025:2017).
 */

export function getWeightRbcObservations() {
  return [
    "O ajuste ou recuperação dos pesos, quando for realizado, não pertence ao escopo de acreditação do laboratório.",
    "Os resultados apresentados referem-se exclusivamente ao instrumento acima caracterizado, não sendo extensivos a quaisquer lotes. Uma cópia deste certificado será arquivada por cinco anos.",
    "A calibração foi realizada pelo método de comparação direta (ABA), conforme procedimento interno PR-7.2 Calibração de Pesos.",
    "Este Certificado de Calibração atende aos requisitos da NBR ISO/IEC 17025:2017.",
    "A calibração foi realizada utilizando peso padrão de referência rastreáveis ao Sistema Internacional de Unidades.",
    "A incerteza expandida de medição relatada é declarada como a incerteza padrão da medição multiplicada pelo fator de abrangência k, o qual para uma distribuição t com Veff igual ao respectivo número de graus de liberdade efetivos que corresponde a uma probabilidade de abrangência de 95,45%. A incerteza padrão de medição foi determinada de acordo com a publicação EA-4/02.",
    "Este certificado só poderá ser utilizado para fins publicitários e/ou promocionais quando autorizado pelo laboratório.",
    "Esta calibração não isenta o instrumento de controle metrológico estabelecido na regulamentação metrológica.",
    "A calibração foi realizada nas dependências do laboratório.",
  ];
}

export function getWeightRastreavelObservations() {
  return [
    "O ajuste ou recuperação dos pesos, quando for realizado, não pertence ao escopo de acreditação do laboratório.",
    "Os resultados apresentados referem-se exclusivamente ao instrumento acima caracterizado, não sendo extensivos a quaisquer lotes. Uma cópia deste certificado será arquivada por cinco anos.",
    "A calibração foi realizada pelo método de comparação direta (ABA), conforme procedimento interno PR-7.2 Calibração de Pesos.",
    "A calibração foi realizada utilizando peso padrão de referência rastreáveis ao Sistema Internacional de Unidades.",
    "A incerteza expandida de medição relatada é declarada como a incerteza padrão da medição multiplicada pelo fator de abrangência k, o qual para uma distribuição t com Veff igual ao respectivo número de graus de liberdade efetivos que corresponde a uma probabilidade de abrangência de 95,45%. A incerteza padrão de medição foi determinada de acordo com a publicação EA-4/02.",
    "Este certificado só poderá ser utilizado para fins publicitários e/ou promocionais quando autorizado pelo laboratório.",
    "Esta calibração não isenta o instrumento de controle metrológico estabelecido na regulamentação metrológica.",
    "A calibração foi realizada nas dependências do laboratório.",
  ];
}

export function getWeightCertificateObservations(certificateType) {
  return certificateType === "rbc"
    ? getWeightRbcObservations()
    : getWeightRastreavelObservations();
}
