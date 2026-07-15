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

function hasNumeric(v) {
  if (v == null || v === "") return false;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n);
}

function ambientMeansFromPayload(ambiente = {}) {
  const a = normalizeWeightAmbiente(ambiente);
  const tempOk = hasNumeric(a.temp_inicial) || hasNumeric(a.temp_final);
  const urOk = hasNumeric(a.umidade_inicial) || hasNumeric(a.umidade_final);
  const pOk = hasNumeric(a.pressao_inicial) || hasNumeric(a.pressao_final);
  return { tempOk, urOk, pOk };
}

/**
 * Valida entradas necessárias ao cálculo RE-5.4.2B (planilha P1).
 * @returns {{ ok: boolean, message: string }}
 */
export function validateWeightCalcPayload(payload = {}) {
  const ambiente = payload.ambiente || {};
  const { tempOk, urOk, pOk } = ambientMeansFromPayload(ambiente);
  if (!tempOk || !urOk || !pOk) {
    return {
      ok: false,
      message: "Preencha temperatura, umidade e pressão no bloco de condições ambientais.",
    };
  }

  const itens = (payload.itens || []).filter((it) => {
    if (!it) return false;
    return (
      String(it.identification || "").trim()
      || hasNumeric(it.nominal_value)
      || String(it.reference_identification || "").trim()
      || (Array.isArray(it.cycles) && it.cycles.some((c) => c?.standard_reading || c?.measuring_reading))
    );
  });

  if (!itens.length) {
    return { ok: false, message: "Inclua ao menos um item de peso com dados de coleta." };
  }

  for (let i = 0; i < itens.length; i += 1) {
    const it = itens[i];
    const label = `Item ${i + 1}${it.identification ? ` (${it.identification})` : ""}`;
    if (!hasNumeric(it.nominal_value)) {
      return { ok: false, message: `${label}: informe o valor nominal.` };
    }
    if (!hasNumeric(it.reference_conventional_value)) {
      return { ok: false, message: `${label}: informe o VVC do peso de referência.` };
    }
    if (!hasNumeric(it.reference_uncertainty)) {
      return { ok: false, message: `${label}: informe a incerteza (Ue) do padrão.` };
    }
    if (!hasNumeric(it.balance_resolution)) {
      return { ok: false, message: `${label}: informe a resolução da balança.` };
    }
    if (!String(it.uut_material || "").trim()) {
      return { ok: false, message: `${label}: selecione o material do mensurando (UUT).` };
    }
    if (!String(it.reference_material || "").trim()) {
      return { ok: false, message: `${label}: selecione o material do peso de referência.` };
    }
    const n = Math.max(1, Math.min(10, Number(it.cycle_count) || 3));
    const cycles = Array.isArray(it.cycles) ? it.cycles : [];
    for (let ci = 0; ci < n; ci += 1) {
      const c = cycles[ci] || {};
      if (!hasNumeric(c.standard_reading) || !hasNumeric(c.measuring_reading)) {
        return {
          ok: false,
          message: `${label}: preencha leituras do padrão e do mensurando no ciclo ${ci + 1}.`,
        };
      }
    }
  }

  return { ok: true, message: "" };
}
