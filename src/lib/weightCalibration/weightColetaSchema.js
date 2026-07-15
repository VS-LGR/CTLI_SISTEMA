/** RE-5.4.2A — payload de coleta de calibração de pesos-padrão */

export const COLETA_DOC_CODE = "RE-5.4.2A";
export const COLETA_DOC_REF = "PR-7.2";
export const COLETA_TEMPLATE_KEY = "re-542a-coleta-peso-padrao-pdf";

export const MAX_WEIGHT_ITEMS = 24;

export function emptyWeightItem(overrides = {}) {
  return {
    identification: "",
    nominal_value: "",
    nominal_unit: "g",
    reference_identification: "",
    reference_standard_id: null,
    reference_conventional_value: "",
    reference_uncertainty: "",
    reference_material: "",
    uut_material: "",
    uut_class: "",
    balance_resolution: "",
    decimal_places: 2,
    cycle_count: 3,
    was_adjusted: false,
    value_before_adjustment: "",
    ambient_temp: "",
    ambient_humidity: "",
    ambient_pressure: "",
    cycles: [
      { standard_reading: "", measuring_reading: "" },
      { standard_reading: "", measuring_reading: "" },
      { standard_reading: "", measuring_reading: "" },
    ],
    assume_class_uncertainty: true,
    ...overrides,
  };
}

/** Colunas válidas de `end_customer_registrations` para o seletor/autofill. */
export const END_CUSTOMER_LOOKUP_SELECT =
  "id, name, representative_name, full_address, city, state, unit, cnpj, email, phone";

/** Preenche dados do cliente a partir do cadastro PR-7.1 → Clientes. */
export function applyEndCustomerToWeightCliente(cliente = {}, endCustomer) {
  if (!endCustomer) {
    return { ...cliente, end_customer_id: "" };
  }
  return {
    ...cliente,
    end_customer_id: endCustomer.id || "",
    solicitante: endCustomer.name || "",
    contratante: cliente.contratante || "O mesmo",
    responsavel: endCustomer.representative_name || "",
    endereco: endCustomer.full_address || "",
    cidade: endCustomer.city || "",
    estado: endCustomer.state || "",
    unidade: endCustomer.unit || "",
    cnpj: endCustomer.cnpj || "",
  };
}

export function resolveWeightEndCustomerId(cliente = {}, endCustomers = []) {
  const cid = cliente?.end_customer_id;
  if (cid && endCustomers.some((c) => c.id === cid)) return cid;
  const name = String(cliente?.solicitante || "").trim();
  if (!name) return "";
  const match = endCustomers.find((c) => String(c.name || "").trim() === name);
  return match?.id || "";
}

export function emptyWeightColetaPayload() {
  return {
    cliente: {
      end_customer_id: "",
      solicitante: "",
      contratante: "",
      endereco: "",
      cidade: "",
      estado: "",
      unidade: "",
      responsavel: "",
      cnpj: "",
    },
    geral: {
      data_calibracao: "",
      processo_numero: "",
      fabricante: "",
      identificacao: "",
      serie: "",
      classe: "",
      qtde_linhas: 2,
      foi_ajuste: "nao",
      obs1: "",
      obs2: "",
      obs3: "",
    },
    peso_descricoes: ["", "", "", ""],
    ambiente: emptyWeightAmbiente(),
    rastreabilidade: {
      balancas: [],
      conjuntos_peso: [],
      tbh: [],
    },
    executores: "",
    itens: Array.from({ length: 4 }, () => emptyWeightItem()),
  };
}

/** Ambiente alinhado à coleta RE-7.2A (campos + TBH). */
export function emptyWeightAmbiente(overrides = {}) {
  return {
    thermo_cert_id: "",
    thermo_cert_id_2: "",
    horario_inicial: "",
    horario_final: "",
    temp_inicial: "",
    temp_final: "",
    umidade_inicial: "",
    umidade_final: "",
    pressao_inicial: "",
    pressao_final: "",
    observacoes: "",
    tbh_correction_raw: {},
    tbh_correction_meta: null,
    tbh_correction_applied: false,
    ...overrides,
  };
}

/** Normaliza ambiente legado (`ur_*`) para o padrão `umidade_*`. */
export function normalizeWeightAmbiente(raw = {}) {
  return emptyWeightAmbiente({
    ...raw,
    umidade_inicial: raw.umidade_inicial || raw.ur_inicial || "",
    umidade_final: raw.umidade_final || raw.ur_final || "",
    observacoes: raw.observacoes || raw.notes || "",
    tbh_correction_raw: raw.tbh_correction_raw || {},
    tbh_correction_meta: raw.tbh_correction_meta || null,
    tbh_correction_applied: !!raw.tbh_correction_applied,
  });
}
