import {
  DEFAULT_AUDIT_CONTRACTING_CRITERIA,
  DEFAULT_AUDIT_SCOPE,
  DEFAULT_PEP_CRITERIA,
  DEFAULT_TBH_ACCEPTANCE,
  DEFAULT_TBH_CALIBRATION_RANGE,
  DEFAULT_TRAINING_CRITERIA,
  defaultOimlCriteria,
} from "@/lib/quotationRequestDefaults";

export const QUOTATION_REQUEST_TYPES = [
  {
    id: "ensaio_proficiencia",
    label: "Aquisição de Ensaio de Proficiência",
    isTableType: false,
  },
  {
    id: "auditoria_interna",
    label: "Aquisição de Auditoria Interna",
    isTableType: true,
  },
  {
    id: "calibracao_termo_baro_higrometro",
    label: "Calibração de Thermo Baro Higrômetro RBC",
    isTableType: true,
  },
  {
    id: "calibracao_pesos_padrao",
    label: "Calibração de Pesos Padrão RBC",
    isTableType: true,
  },
  {
    id: "treinamento",
    label: "Aquisição de Treinamento",
    isTableType: true,
  },
  {
    id: "aquisicao_termo_baro_higrometro",
    label: "Aquisição de Thermo Baro Higrômetro RBC",
    isTableType: true,
  },
  {
    id: "aquisicao_pesos_padrao",
    label: "Aquisição de Pesos Padrão RBC",
    isTableType: true,
  },
];

export const QUOTATION_REQUEST_STATUSES = [
  { id: "rascunho", label: "Rascunho" },
  { id: "aguardando_envio", label: "Aguardando envio" },
  { id: "enviada_fornecedor", label: "Enviada ao provedor" },
  { id: "orcamento_recebido", label: "Orçamento recebido" },
  { id: "em_analise", label: "Em análise" },
  { id: "aprovada", label: "Aprovada" },
  { id: "reprovada", label: "Reprovada" },
  { id: "convertida_pedido_compra", label: "Convertida em Pedido de Compra" },
  { id: "cancelada", label: "Cancelada" },
];

const STATUS_TRANSITIONS = {
  rascunho: ["aguardando_envio", "cancelada"],
  aguardando_envio: ["enviada_fornecedor", "rascunho", "cancelada"],
  enviada_fornecedor: ["orcamento_recebido", "cancelada"],
  orcamento_recebido: ["em_analise", "cancelada"],
  em_analise: ["aprovada", "reprovada", "cancelada"],
  aprovada: ["cancelada"],
  reprovada: ["rascunho", "cancelada"],
  convertida_pedido_compra: [],
  cancelada: ["rascunho"],
};

export function canTransitionToConvertedPurchaseOrder(from) {
  return from === "aprovada";
}

export function canTransitionStatus(from, to) {
  if (to === "convertida_pedido_compra") return false;
  return (STATUS_TRANSITIONS[from] || []).includes(to);
}

export function getTypeMeta(typeId) {
  return QUOTATION_REQUEST_TYPES.find((t) => t.id === typeId) || null;
}

export function statusLabel(status) {
  return QUOTATION_REQUEST_STATUSES.find((s) => s.id === status)?.label || status || "—";
}

export function canExportDraft(status) {
  return status === "rascunho";
}

export function emptyTypeSection(typeId) {
  const meta = getTypeMeta(typeId);
  if (!meta) return null;
  const base = {
    type: typeId,
    is_selected: false,
    essay_scope: "",
    acquisition_criteria: "",
    default_criteria: "",
    custom_criteria: "",
    notes: "",
  };
  if (typeId === "ensaio_proficiencia") {
    base.acquisition_criteria = DEFAULT_PEP_CRITERIA;
    base.default_criteria = DEFAULT_PEP_CRITERIA;
  }
  return base;
}

export function emptyQuotationRequestItem(sectionType, itemNumber = 1) {
  const item = {
    section_type: sectionType,
    item_number: itemNumber,
    equipment: "",
    material: "",
    identification_codes: "",
    nominal_values_or_calibration_range: "",
    max_error_uncertainty_or_acceptance_criteria: "",
    quantity: 1,
    audit_scope: DEFAULT_AUDIT_SCOPE,
    auditors: "",
    contracting_criteria: DEFAULT_AUDIT_CONTRACTING_CRITERIA,
    quantity_days: 1,
    training_name: "",
    participants_number: 1,
    magnitude: "",
    minimum_reading_range: "",
    acceptable_resolution: "",
    linked_weight_ids: [],
    linked_certificate_ids: [],
    linked_env_cert_id: null,
    payload: {},
  };
  if (sectionType === "calibracao_termo_baro_higrometro") {
    item.nominal_values_or_calibration_range = DEFAULT_TBH_CALIBRATION_RANGE;
    item.max_error_uncertainty_or_acceptance_criteria = DEFAULT_TBH_ACCEPTANCE;
  }
  if (sectionType === "aquisicao_termo_baro_higrometro") {
    item.max_error_uncertainty_or_acceptance_criteria = DEFAULT_TBH_ACCEPTANCE;
  }
  if (sectionType === "calibracao_pesos_padrao" || sectionType === "aquisicao_pesos_padrao") {
    item.max_error_uncertainty_or_acceptance_criteria = defaultOimlCriteria("");
  }
  if (sectionType === "treinamento") {
    item.max_error_uncertainty_or_acceptance_criteria = DEFAULT_TRAINING_CRITERIA;
  }
  return item;
}

export function buildInitialSections() {
  return QUOTATION_REQUEST_TYPES.map((t) => emptyTypeSection(t.id));
}

/** Garante no máximo um tipo selecionado (solicitação = um orçamento por vez). */
export function normalizeSingleSelectedSections(sections) {
  const selected = (sections || []).filter((s) => s.is_selected);
  if (selected.length <= 1) return sections || [];
  const keepType = selected[0].type;
  return sections.map((s) => ({ ...s, is_selected: s.type === keepType }));
}

/** Colunas da tabela de itens por tipo (UI + PDF). */
export function getItemColumns(typeId) {
  switch (typeId) {
    case "auditoria_interna":
      return [
        { key: "item_number", label: "Item", type: "number", readOnly: true },
        { key: "audit_scope", label: "Escopo da Auditoria", type: "textarea" },
        { key: "auditors", label: "Auditores", type: "text" },
        { key: "contracting_criteria", label: "Critérios para Contratação", type: "textarea" },
        { key: "quantity_days", label: "Quantidade de dias", type: "number" },
      ];
    case "calibracao_termo_baro_higrometro":
      return [
        { key: "item_number", label: "Item", type: "number", readOnly: true },
        { key: "equipment", label: "Equipamento", type: "text" },
        { key: "material", label: "Material", type: "text" },
        { key: "identification_codes", label: "Código(s) de Identificação", type: "text" },
        { key: "nominal_values_or_calibration_range", label: "Valor(es) Nominal(is) ou Faixa de Calibração", type: "textarea" },
        { key: "max_error_uncertainty_or_acceptance_criteria", label: "Erro e Incerteza Máx. ou Critérios de Aceitação", type: "textarea" },
        { key: "quantity", label: "Quantidade de peças", type: "number" },
      ];
    case "calibracao_pesos_padrao":
    case "aquisicao_pesos_padrao":
      return [
        { key: "item_number", label: "Item", type: "number", readOnly: true },
        { key: "equipment", label: "Equipamento", type: "text" },
        { key: "material", label: "Material", type: "text" },
        { key: "identification_codes", label: "Código(s) de Identificação", type: "text" },
        { key: "nominal_values_or_calibration_range", label: "Valor(es) Nominal(is) ou Faixa de Calibração", type: "textarea" },
        { key: "max_error_uncertainty_or_acceptance_criteria", label: "Erro e Incerteza Máx. ou Critérios de Aceitação", type: "textarea" },
        { key: "quantity", label: "Quantidade de peças", type: "number" },
      ];
    case "treinamento":
      return [
        { key: "item_number", label: "Item", type: "number", readOnly: true },
        { key: "training_name", label: "Nome do Treinamento", type: "text" },
        { key: "participants_number", label: "Número de Participantes", type: "number" },
        { key: "max_error_uncertainty_or_acceptance_criteria", label: "Critérios de Aceitação", type: "textarea" },
      ];
    case "aquisicao_termo_baro_higrometro":
      return [
        { key: "item_number", label: "Item", type: "number", readOnly: true },
        { key: "equipment", label: "Equipamento", type: "text" },
        { key: "identification_codes", label: "Código", type: "text" },
        { key: "magnitude", label: "Grandeza", type: "text" },
        { key: "minimum_reading_range", label: "Faixa Mínima de Leitura", type: "text" },
        { key: "acceptable_resolution", label: "Resolução Máxima Aceitável", type: "text" },
        { key: "max_error_uncertainty_or_acceptance_criteria", label: "Erro e Incerteza Máx. ou Critérios de Aceitação", type: "textarea" },
        { key: "quantity", label: "Quantidade de peças", type: "number" },
      ];
    default:
      return [];
  }
}

