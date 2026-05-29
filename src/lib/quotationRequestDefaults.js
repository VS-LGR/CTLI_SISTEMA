export const DOCUMENT_MODEL_ISSUE_DATE = "2025-06-30";

export const DEFAULT_PEP_CRITERIA =
  "O provedor deve ser acreditado pela CGCRE.\n"
  + "O provedor deve atender os equipamentos planejados pelo laboratório.";

export const DEFAULT_AUDIT_SCOPE = "Auditoria nos itens da NBR ISO/IEC 17025:2017.";

export const DEFAULT_AUDIT_CONTRACTING_CRITERIA =
  "Apresentação do Currículo do Auditor / Comprovação de Competência.";

export const DEFAULT_TBH_CALIBRATION_RANGE =
  "Temperatura: 10, 20, 30 e 40 ºC\n"
  + "Umidade: 20, 40, 60 e 80 %UR\n"
  + "Pressão Atmosférica: no mínimo os pontos 900, 950, 1000 e 1050 hPa";

export const DEFAULT_TBH_ACCEPTANCE =
  "Temperatura: 0,5 ºC\nUmidade Relativa: 3 %UR\nPressão Atmosférica: 5 hPa";

export const DEFAULT_TRAINING_CRITERIA = "Apresentação do Currículo do Instrutor.";

export function defaultOimlCriteria(className) {
  const cls = className || "[classe]";
  return `Conforme OIML-R-111-1 para pesos padrão Classe ${cls}.`;
}
