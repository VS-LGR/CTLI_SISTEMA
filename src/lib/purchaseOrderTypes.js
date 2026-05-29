export const PURCHASE_ORDER_TYPES = [
  {
    id: "calibracao_pesos_padrao",
    label: "Calibração de Pesos-Padrão",
    serviceTypeLabel: "Calibração de Pesos-Padrão em laboratório Acreditado na Rede Brasileira de Calibração.",
  },
  {
    id: "calibracao_termo_baro_higrometro",
    label: "Calibração de Termo-Baro-Higrômetro",
    serviceTypeLabel: "Calibração de Termo-Baro-Higrômetro em laboratório Acreditado na Rede Brasileira de Calibração.",
  },
  {
    id: "compra_pesos",
    label: "Compra de Pesos",
    serviceTypeLabel: "Aquisição de Pesos Padrão",
  },
  {
    id: "compra_termo_baro_higrometro",
    label: "Compra de Termo-Baro-Higrômetro",
    serviceTypeLabel: "Aquisição de Termo-Baro-Higrômetro",
  },
  {
    id: "auditoria_interna",
    label: "Auditoria Interna",
    serviceTypeLabel: "Auditoria Interna do Sistema de gestão",
  },
  {
    id: "ensaio_proficiencia",
    label: "PEP — Ensaio de Proficiência",
    serviceTypeLabel: "Aquisição de Ensaio de Proficiência",
  },
];

export const PURCHASE_ORDER_STATUSES = [
  { id: "rascunho", label: "Rascunho" },
  { id: "aguardando_aprovacao_tecnica", label: "Aguardando aprovação técnica" },
  { id: "aprovado_tecnicamente", label: "Aprovado tecnicamente" },
  { id: "enviado_fornecedor", label: "Enviado ao fornecedor" },
  { id: "aguardando_recebimento", label: "Aguardando recebimento" },
  { id: "recebido_parcialmente", label: "Recebido parcialmente" },
  { id: "recebido", label: "Recebido" },
  { id: "reprovado_recebimento", label: "Reprovado no recebimento" },
  { id: "cancelado", label: "Cancelado" },
];

const STATUS_TRANSITIONS = {
  rascunho: ["aguardando_aprovacao_tecnica", "cancelado"],
  aguardando_aprovacao_tecnica: ["aprovado_tecnicamente", "rascunho", "cancelado"],
  aprovado_tecnicamente: ["enviado_fornecedor", "cancelado"],
  enviado_fornecedor: ["aguardando_recebimento", "cancelado"],
  aguardando_recebimento: ["recebido_parcialmente", "recebido", "reprovado_recebimento", "cancelado"],
  recebido_parcialmente: ["recebido", "reprovado_recebimento"],
  recebido: ["aguardando_recebimento"],
  reprovado_recebimento: ["aguardando_recebimento"],
  cancelado: ["rascunho"],
};

export function getTypeMeta(typeId) {
  return PURCHASE_ORDER_TYPES.find((t) => t.id === typeId) || null;
}

export function getTitleForType(typeId) {
  const t = getTypeMeta(typeId);
  if (!t) return "Pedido de Compra";
  if (typeId === "calibracao_pesos_padrao") return "Aquisição de serviços de calibração de Pesos-Padrão";
  if (typeId === "calibracao_termo_baro_higrometro") return "Aquisição de serviços de calibração de termo-baro-higrômetro";
  if (typeId === "compra_pesos") return "Aquisição de Pesos-padrão";
  if (typeId === "compra_termo_baro_higrometro") return "Aquisição de termo-baro-higrômetro";
  if (typeId === "auditoria_interna") return "Auditoria Interna do Sistema de Gestão";
  if (typeId === "ensaio_proficiencia") return "Aquisição de Ensaio de Proficiência";
  return "Pedido de Compra";
}

export function formatOrderNumber(orderNumber, orderYear) {
  const n = String(orderNumber || 0).padStart(3, "0");
  return `${n}/${orderYear || new Date().getFullYear()}`;
}

export function canTransitionStatus(from, to) {
  return (STATUS_TRANSITIONS[from] || []).includes(to);
}

export function canEditOrder(_status) {
  return true;
}

export function canExportFinal(status) {
  return !["rascunho", "cancelado"].includes(status);
}

export function canExportDraft(status) {
  return status === "rascunho";
}

export function statusLabel(status) {
  return PURCHASE_ORDER_STATUSES.find((s) => s.id === status)?.label || status || "—";
}

export const DEFAULT_OBSERVATIONS =
  "Constar na Nota Fiscal: Nº Pedido, Forma de Pagamento e Vencimento.";

export function emptyPurchaseOrderItem(itemNumber = 1) {
  return {
    item_number: itemNumber,
    equipment: "",
    material: "",
    identification_codes: "",
    nominal_values: "",
    range_text: "",
    class_text: "",
    magnitude: "",
    minimum_reading_range: "",
    acceptable_resolution: "",
    max_error_uncertainty: "",
    hiring_criteria: "",
    program_name: "",
    artifacts_description: "",
    audit_scope: "",
    quantity: 1,
    unit_value: 0,
    taxes_percent: 0,
    taxes_included: true,
    total_value: 0,
    linked_weight_ids: [],
    linked_certificate_ids: [],
    linked_env_cert_id: null,
    payload: {},
  };
}

/** Rótulos e visibilidade de campos por tipo de serviço. */
export function getServiceFieldConfig(typeId) {
  const isPesos = typeId === "calibracao_pesos_padrao" || typeId === "compra_pesos";
  const isThermo = typeId === "calibracao_termo_baro_higrometro" || typeId === "compra_termo_baro_higrometro";
  const isCalibPesos = typeId === "calibracao_pesos_padrao";

  return {
    hideExecutionPeriod: isCalibPesos,
    codeFreeTextOnly: isCalibPesos,
    columns: {
      nominalLabel: isThermo || isPesos
        ? "Valores nominais aproximados a serem calibrados"
        : "Valor nominal / faixa",
      errorLabel: isThermo || isPesos
        ? "Erro e Incerteza Máxima Permitida"
        : "Classe / erro",
    },
  };
}

export function emptyInspection() {
  return {
    received_matches_order: null,
    certificate_matches_order: null,
    certificate_numbers: "",
    supplier_sent_report: null,
    report_matches_order: null,
    reason: "",
    result: null,
    inspection_responsible_id: null,
    inspection_date: "",
    notes: "",
    type_specific: {},
  };
}
