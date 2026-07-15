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

export function emptyWeightColetaPayload() {
  return {
    cliente: {
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
    ambiente: {
      temp_inicial: "",
      temp_final: "",
      ur_inicial: "",
      ur_final: "",
      pressao_inicial: "",
      pressao_final: "",
    },
    rastreabilidade: {
      balancas: [],
      conjuntos_peso: [],
      tbh: [],
    },
    executores: "",
    itens: Array.from({ length: 4 }, () => emptyWeightItem()),
  };
}
