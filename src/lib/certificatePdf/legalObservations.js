/**
 * Observações legais do certificado RE-7.2B — alinhadas ao EmissãoTeste.pdf / modelo matriz.
 */

export function getRbcObservations() {
  return [
    "A calibração foi realizada nas instalações do Cliente. Este certificado é válido apenas para a balança calibrada. Uma cópia deste certificado será arquivada por cinco anos.",
    "Este certificado só poderá ser usado para fins publicitários e/ou promocionais quando autorizado pela CTLI.",
    "A incerteza expandida de medição relatada é declarada como a incerteza padrão da medição multiplicada pelo fator de abrangência k, o qual para uma distribuição t com Veff igual ao respectivo número de graus de liberdade efetivos que corresponde a uma probabilidade de abrangência de 95,45%. A incerteza padrão de medição foi determinada de acordo com a publicação EA-4/02.",
    "A calibração foi realizada utilizando peso padrão de propriedade da CTLI rastreáveis ao Sistema Internacional de Unidades.",
    "Este Certificado de Calibração atende aos requisitos da NBR ISO/IEC 17025:2017.",
    "A calibração foi realizada pelo método de comparação direta, conforme procedimento interno PR-7.2 Calibração de Balanças.",
    "Esta calibração não isenta a balança do controle estabelecido da Regulamentação Metrológica.",
  ];
}

export function getRastreavelObservations() {
  return [
    "A calibração foi realizada nas instalações do Cliente. Este certificado é válido apenas para a balança calibrada. Uma cópia deste certificado será arquivada por cinco anos.",
    "Este certificado só poderá ser usado para fins publicitários e/ou promocionais quando autorizado pela CTLI.",
    "A incerteza expandida de medição relatada é declarada como a incerteza padrão da medição multiplicada pelo fator de abrangência k, o qual para uma distribuição t com Veff igual ao respectivo número de graus de liberdade efetivos que corresponde a uma probabilidade de abrangência de 95,45%. A incerteza padrão de medição foi determinada de acordo com a publicação EA-4/02.",
    "A calibração foi realizada utilizando peso padrão rastreáveis ao Sistema Internacional de Unidades.",
    "Este certificado é emitido por laboratório credenciado pelo IPEM-MG para calibração rastreável a padrões nacionais/internacionais.",
    "A calibração foi realizada pelo método de comparação direta, conforme procedimento interno PR-7.2 Calibração de Balanças.",
    "Esta calibração não isenta a balança do controle estabelecido da Regulamentação Metrológica.",
  ];
}

export function getCertificateObservations(certificateType) {
  return certificateType === "rbc" ? getRbcObservations() : getRastreavelObservations();
}

function pickObservationsFromMeta(documentMeta, certificateType) {
  if (!documentMeta || typeof documentMeta !== "object") return null;
  const key = certificateType === "rbc" ? "rbc" : "rastreavel";
  const direct = documentMeta.certificateObservations?.[key];
  const fromExport = documentMeta.exportTemplateConfig?.certificateObservations?.[key]
    || documentMeta.export_template_config?.certificateObservations?.[key];
  const items = Array.isArray(direct) ? direct : fromExport;
  if (!Array.isArray(items)) return null;
  const cleaned = items.map((item) => String(item).trim()).filter(Boolean);
  return cleaned.length ? cleaned : null;
}

/** Lista Mestra (RE-7.2B) com fallback ao modelo padrão CTLI. */
export function resolveCertificateObservations(certificateType, documentMeta = {}) {
  const fromMaster = pickObservationsFromMeta(documentMeta, certificateType);
  if (fromMaster) return fromMaster;
  return getCertificateObservations(certificateType);
}
