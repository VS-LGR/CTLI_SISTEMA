/** RE-7.2A Rev.03 — estrutura do payload de coleta de calibração */

export const COLETA_DOC_CODE = "RE-7.2A";
export const COLETA_DOC_REF = "PR-7.2";
export const COLETA_DOC_REV = "Rev.03 de 14/05/2026";

export const UNIDADE_OPTIONS = [
  { value: "mg", label: "mg" },
  { value: "g", label: "g" },
  { value: "kg", label: "kg" },
];

export const TIPO_BALANCA_OPTIONS = [
  { value: "analitica", label: "Analítica" },
  { value: "semi_analitica", label: "Semi-analítica" },
  { value: "comercial", label: "Comercial" },
  { value: "industrial", label: "Industrial" },
  { value: "silo", label: "Silo" },
  { value: "tanque", label: "Tanque" },
  { value: "rodoviaria", label: "Rodoviária" },
  { value: "ferroviaria", label: "Ferroviária" },
  { value: "outros", label: "Outros" },
];

export const TIPO_PLATAFORMA_OPTIONS = [
  { value: "retangular_quadrada", label: "Retangular ou Quadrada" },
  { value: "redondo", label: "Redondo" },
  { value: "rodoviaria", label: "Rodoviária" },
  { value: "ferroviaria", label: "Ferroviária" },
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
    pesos_padrao_ids: [],
  };
}

function emptyLote() {
  return {
    leituras: ["", "", ""],
    depois_ajuste: "",
    valor_nominal_carga: "",
    massa_especifica: "",
    temp: "",
    umidade: "",
    pressao: "",
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
      thermo_cert_id: "",
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
    verso: {
      descricao_carga: "",
      questoes_carga: {
        facil_manuseio: "",
        facil_centro_gravidade: "",
        massa_constante: "",
      },
      repetitividade: {
        formacao_carga: "",
        massa_especifica_estimada: "",
        observacoes: "",
        p1_valor_balanca: "",
        lotes: Array.from({ length: 6 }, () => emptyLote()),
      },
    },
  };
}

export function mergeColetaPayload(raw) {
  const base = emptyColetaPayload();
  if (!raw || typeof raw !== "object") return base;

  const migrateAmbiente = (a) => {
    const merged = { ...base.ambiente, ...(a || {}) };
    if (a?.climatizacao && !merged.thermo_cert_id) {
      merged.thermo_cert_id = "";
    }
    delete merged.climatizacao;
    return merged;
  };

  const migrateCalPoint = (pt) => {
    const p = { ...emptyCalPoint(), ...(pt || {}) };
    if (p.identificacao_pesos && !p.pesos_padrao_ids?.length) {
      p.pesos_padrao_ids = [];
    }
    delete p.identificacao_pesos;
    return p;
  };

  return {
    cliente: { ...base.cliente, ...(raw.cliente || {}) },
    balanca: { ...base.balanca, ...(raw.balanca || {}) },
    ambiente: migrateAmbiente(raw.ambiente),
    excentricidade: {
      valor_aplicado: raw.excentricidade?.valor_aplicado ?? "",
      pontos: Array.from({ length: 6 }, (_, i) => ({
        ...emptyEccPoint(),
        ...(raw.excentricidade?.pontos?.[i] || {}),
      })),
    },
    controle: { ...base.controle, ...(raw.controle || {}) },
    calibracao: {
      pontos: Array.from({ length: 10 }, (_, i) => migrateCalPoint(raw.calibracao?.pontos?.[i])),
    },
    verso: {
      descricao_carga: raw.verso?.descricao_carga ?? "",
      questoes_carga: {
        ...base.verso.questoes_carga,
        ...(raw.verso?.questoes_carga || {}),
      },
      repetitividade: {
        formacao_carga: raw.verso?.repetitividade?.formacao_carga ?? "",
        massa_especifica_estimada: raw.verso?.repetitividade?.massa_especifica_estimada ?? "",
        observacoes: raw.verso?.repetitividade?.observacoes ?? "",
        p1_valor_balanca: raw.verso?.repetitividade?.p1_valor_balanca ?? "",
        lotes: Array.from({ length: 6 }, (_, i) => ({
          ...emptyLote(),
          ...(raw.verso?.repetitividade?.lotes?.[i] || {}),
          leituras: [
            raw.verso?.repetitividade?.lotes?.[i]?.leituras?.[0] ?? "",
            raw.verso?.repetitividade?.lotes?.[i]?.leituras?.[1] ?? "",
            raw.verso?.repetitividade?.lotes?.[i]?.leituras?.[2] ?? "",
          ],
        })),
      },
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

export function weightCertLabel(w) {
  if (!w) return "—";
  const parts = [w.set_name, w.certificate_number].filter(Boolean);
  const base = parts.join(" — ") || "Conjunto";
  return w.class ? `${base} (Classe ${w.class})` : base;
}

export function envCertLabel(e) {
  if (!e) return "—";
  return [e.equipment_name, e.certificate_number].filter(Boolean).join(" — ") || "Equipamento";
}

export function triStateLabel(v) {
  const o = TRI_STATE_OPTIONS.find((x) => x.value === v);
  return o ? o.label : v || "—";
}

export function binaryLabel(v) {
  const o = BINARY_OPTIONS.find((x) => x.value === v);
  return o ? o.label : v || "—";
}

export function simNaoLabel(v) {
  if (v === "sim") return "Sim";
  if (v === "nao") return "Não";
  return v || "—";
}

export function tipoBalancaLabel(v, outros = "") {
  if (v === "outros") return outros ? `Outros: ${outros}` : "Outros";
  return TIPO_BALANCA_OPTIONS.find((x) => x.value === v)?.label || v || "—";
}

export function tipoPlataformaLabel(v) {
  return TIPO_PLATAFORMA_OPTIONS.find((x) => x.value === v)?.label || v || "—";
}

export function unidadeLabel(v) {
  return UNIDADE_OPTIONS.find((x) => x.value === v)?.label || v || "—";
}

export function formatPesosIds(ids, weightCerts) {
  if (!ids?.length || !weightCerts?.length) return "";
  return ids
    .map((id) => weightCerts.find((w) => w.id === id))
    .filter(Boolean)
    .map(weightCertLabel)
    .join("; ");
}
