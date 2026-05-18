/** RE-7.2A Rev.03 — estrutura do payload de coleta de calibração */

export const COLETA_DOC_CODE = "RE-7.2A";
export const COLETA_DOC_REF = "PR-7.2";
export const COLETA_DOC_REV = "Rev.03 de 14/05/2026";

export const TIPO_BALANCA_OPTIONS = [
  { value: "analitica", label: "Analítica" },
  { value: "semi_analitica", label: "Semi-analítica" },
  { value: "comercial", label: "Comercial" },
  { value: "industrial", label: "Industrial" },
  { value: "silo", label: "Silo" },
  { value: "tanque", label: "Tanque" },
  { value: "rodoviaria", label: "Rodoviária" },
  { value: "outros", label: "Outros" },
];

export const TIPO_PLATAFORMA_OPTIONS = [
  { value: "retangular_quadrada", label: "Retangular ou Quadrada" },
  { value: "redondo", label: "Redondo" },
  { value: "rodoviaria", label: "Rodoviária" },
  { value: "excentricidade_na", label: "Excentricidade Não Aplicável" },
];

export const TRI_STATE_OPTIONS = [
  { value: "sim", label: "Sim" },
  { value: "nao", label: "Não" },
  { value: "na", label: "Não disponível" },
];

export const BINARY_OPTIONS = [
  { value: "sim", label: "Sim" },
  { value: "nao", label: "Não" },
];

function emptyEccPoint() {
  return { antes: "", depois: "" };
}

function emptyCalPoint() {
  return {
    peso_nominal: "",
    leitura_antes: "",
    rep1: "",
    rep2: "",
    rep3: "",
    identificacao_pesos: "",
  };
}

export function emptyColetaPayload() {
  return {
    cliente: { cliente: "", responsavel: "" },
    balanca: {
      fabricante: "",
      modelo: "",
      serie: "",
      tag: "",
      local: "",
      etiqueta_ipem: "",
      portaria_inmetro: "",
      capacidade: "",
      resolucao: "",
      unidade: "",
      tipo_balanca: "",
      tipo_balanca_outros: "",
      tipo_plataforma: "",
    },
    ambiente: {
      climatizacao: "",
      horario_inicial: "",
      horario_final: "",
      temp_inicial: "",
      temp_final: "",
      umidade_inicial: "",
      umidade_final: "",
      pressao_inicial: "",
      pressao_final: "",
      balanca_ajustada: "",
      balanca_nivelada: "",
      existe_vibracao: "",
      existe_corrente_ar: "",
    },
    excentricidade: {
      valor_aplicado: "",
      pontos: Array.from({ length: 6 }, () => emptyEccPoint()),
    },
    controle: {
      representante_cliente: "",
      conferido_por: "",
      numero_certificado: "",
      nome_executor: "",
      data_calibracao: "",
      pontos_solicitados: "",
    },
    calibracao: {
      pontos: Array.from({ length: 10 }, () => emptyCalPoint()),
    },
  };
}

export function mergeColetaPayload(raw) {
  const base = emptyColetaPayload();
  if (!raw || typeof raw !== "object") return base;
  return {
    cliente: { ...base.cliente, ...(raw.cliente || {}) },
    balanca: { ...base.balanca, ...(raw.balanca || {}) },
    ambiente: { ...base.ambiente, ...(raw.ambiente || {}) },
    excentricidade: {
      valor_aplicado: raw.excentricidade?.valor_aplicado ?? "",
      pontos: Array.from({ length: 6 }, (_, i) => ({
        ...emptyEccPoint(),
        ...(raw.excentricidade?.pontos?.[i] || {}),
      })),
    },
    controle: { ...base.controle, ...(raw.controle || {}) },
    calibracao: {
      pontos: Array.from({ length: 10 }, (_, i) => ({
        ...emptyCalPoint(),
        ...(raw.calibracao?.pontos?.[i] || {}),
      })),
    },
  };
}

export function denormalizeFromPayload(payload, commercialProposalRef = "") {
  const p = mergeColetaPayload(payload);
  return {
    commercial_proposal_ref: commercialProposalRef || "",
    client_name: p.cliente.cliente || "",
    responsible_name: p.cliente.responsavel || "",
    scale_serial: p.balanca.serie || "",
    calibration_date: p.controle.data_calibracao || null,
    payload: p,
  };
}

export function triStateLabel(v) {
  const o = TRI_STATE_OPTIONS.find((x) => x.value === v);
  return o ? o.label : v || "—";
}

export function binaryLabel(v) {
  const o = BINARY_OPTIONS.find((x) => x.value === v);
  return o ? o.label : v || "—";
}

export function tipoBalancaLabel(v, outros = "") {
  if (v === "outros") return outros ? `Outros: ${outros}` : "Outros";
  return TIPO_BALANCA_OPTIONS.find((x) => x.value === v)?.label || v || "—";
}

export function tipoPlataformaLabel(v) {
  return TIPO_PLATAFORMA_OPTIONS.find((x) => x.value === v)?.label || v || "—";
}
