export const EQUIPMENT_VERIFICATION_KINDS = [
  { value: "pesos", label: "Pesos" },
  { value: "thermo", label: "Thermobarohigrômetro" },
  { value: "computador", label: "Computadores" },
  { value: "veiculo", label: "Veículos" },
];

export const MONTH_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];

export const MONTH_LABELS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

/** Pesos / Thermo: Sim/Não. Computador / Veículo: Bom/Ruim. */
export function verificationValueMode(kind) {
  return kind === "computador" || kind === "veiculo" ? "bom_ruim" : "sim_nao";
}

export function verificationValueOptions(kind) {
  if (verificationValueMode(kind) === "bom_ruim") {
    return [
      { value: "", label: "—" },
      { value: "ok", label: "Bom" },
      { value: "nok", label: "Ruim" },
    ];
  }
  return [
    { value: "", label: "—" },
    { value: "ok", label: "Sim" },
    { value: "nok", label: "Não" },
  ];
}

export function formatVerificationValue(kind, value) {
  if (!value) return "";
  const opt = verificationValueOptions(kind).find((o) => o.value === value);
  return opt?.label || value;
}

const CHECKLISTS = {
  pesos: [
    { key: "limpo", label: "Está Limpo?" },
    { key: "quebrado", label: "Está quebrado?" },
    { key: "armazenado", label: "Está armazenado corretamente?" },
    { key: "identificado", label: "Está identificado?" },
    { key: "lacre", label: "O lacre do peso está violado?" },
    { key: "etiqueta", label: "Existe etiqueta no equipamento?" },
    { key: "luvas", label: "Luvas disponíveis?" },
    { key: "pinças", label: "Pinças disponíveis?" },
    { key: "caixas", label: "Caixas em bom estado?" },
  ],
  thermo: [
    { key: "limpo", label: "Está Limpo?" },
    { key: "quebrado", label: "Está quebrado?" },
    { key: "armazenado", label: "Está armazenado corretamente?" },
    { key: "identificado", label: "Está identificado?" },
    { key: "bateria", label: "Bateria está ok?" },
    { key: "etiqueta_calibracao", label: "Existe etiqueta de calibração no equipamento?" },
    { key: "tabela_correcao", label: "Está com a tabela de correção?" },
  ],
  computador: [
    { key: "monitor", label: "Situação do monitor?" },
    { key: "teclado", label: "Situação do Teclado?" },
    { key: "mouse", label: "Situação do mouse?" },
    { key: "gravador_cd", label: "Situação do gravador de CD?" },
    { key: "nuvem", label: "Situação da memória do Drive em Nuvem" },
    { key: "antivirus", label: "Antivírus está atualizado?" },
  ],
  veiculo: [
    { key: "pneus", label: "Estado dos pneus" },
    { key: "farois", label: "Faróis e Lanternas" },
    { key: "freio", label: "Sistema de Freio" },
    { key: "luzes", label: "Luzes" },
    { key: "limpador", label: "Limpador de Parabrisa" },
    { key: "oleo", label: "Nível de óleo no Cárter" },
    { key: "agua", label: "Água do Radiador" },
    { key: "extintor", label: "Extintor e Triângulo" },
    { key: "macaco", label: "Macaco / Chave de Roda" },
    { key: "documentacao", label: "Documentação" },
  ],
};

export function getVerificationChecklist(kind) {
  return CHECKLISTS[kind] || [];
}

export function equipmentKindLabel(kind) {
  return EQUIPMENT_VERIFICATION_KINDS.find((k) => k.value === kind)?.label || kind || "—";
}

export function emptyVerificationResponses(kind) {
  const out = {};
  for (const item of getVerificationChecklist(kind)) {
    out[item.key] = Object.fromEntries(MONTH_KEYS.map((m) => [m, ""]));
  }
  return out;
}

export function normalizeVerificationResponses(kind, responses = {}) {
  const base = emptyVerificationResponses(kind);
  for (const item of getVerificationChecklist(kind)) {
    const src = responses?.[item.key] || {};
    for (const m of MONTH_KEYS) {
      base[item.key][m] = src[m] || "";
    }
  }
  return base;
}
