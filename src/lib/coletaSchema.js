/** RE-7.2A — estrutura do payload de coleta de calibração */

import {
  MASS_UNIT_OPTIONS,
  formatMassDisplay,
  massDisplayFromRecord,
  parseLegacyMassString,
  resolveMassFields,
  sanitizeMassNumericInput,
} from "./massValueUtils";

export const COLETA_DOC_CODE = "RE-7.2A";
export const COLETA_DOC_REF = "PR-7.2";
export const COLETA_DOC_REV = "Rev.03 de 14/05/2026";

export const UNIDADE_OPTIONS = MASS_UNIT_OPTIONS;

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

/** Linha só L (L1..L6), sem L+P — massa específica até hPa ficam nulos no formulário/PDF */
export function isSubstituicaoLinhaSoloL(defOrKey) {
  const key = typeof defOrKey === "string" ? defOrKey : defOrKey?.key;
  return /^l\d+$/.test(key || "");
}

/** Ordem fixa das linhas no coletaVerso.pdf */
export const SUBSTITUICAO_LINHA_DEFS = [
  { key: "p1", label: "P1*", leituras3: true },
  { key: "l1", label: "L1", leituras3: false },
  { key: "l1_p1", label: "L1 + P1", leituras3: false },
  { key: "l2", label: "L2", leituras3: false },
  { key: "l2_p1", label: "L2 + P1", leituras3: false },
  { key: "l3", label: "L3", leituras3: false },
  { key: "l3_p1", label: "L3 + P1", leituras3: false },
  { key: "l4", label: "L4", leituras3: false },
  { key: "l4_p1", label: "L4 + P1", leituras3: false },
  { key: "l5", label: "L5", leituras3: false },
  { key: "l5_p1", label: "L5 + P1", leituras3: false },
  { key: "l6", label: "L6", leituras3: false },
  { key: "l6_p1", label: "L6 + P1", leituras3: false },
];

function emptyEccPoint() {
  return { antes: "", depois: "" };
}

function emptyCalPoint() {
  return {
    peso_nominal: "",
    peso_nominal_valor: "",
    peso_nominal_unidade: "",
    leitura_antes: "",
    rep1: "",
    rep2: "",
    rep3: "",
    pesos_padrao_ids: [],
  };
}

function emptySubstituicaoLinha(def) {
  return {
    key: def.key,
    label: def.label,
    valor_nominal: "",
    valor_nominal_valor: "",
    valor_nominal_unidade: "",
    leitura1: "",
    leitura2: "",
    leitura3: "",
    massa_especifica: "",
    temp: "",
    umidade: "",
    pressao: "",
  };
}

export function emptySubstituicaoLinhas() {
  return SUBSTITUICAO_LINHA_DEFS.map((d) => emptySubstituicaoLinha(d));
}

function migrateLotesToLinhas(rawRep) {
  const linhas = emptySubstituicaoLinhas();
  const byKey = Object.fromEntries(linhas.map((l) => [l.key, l]));

  if (rawRep?.linhas?.length) {
    rawRep.linhas.forEach((row) => {
      if (row?.key && byKey[row.key]) {
        byKey[row.key] = { ...byKey[row.key], ...row, label: byKey[row.key].label };
      }
    });
    return SUBSTITUICAO_LINHA_DEFS.map((d) => byKey[d.key]);
  }

  const lotes = rawRep?.lotes || [];
  const loteKeys = ["l1", "l2", "l3", "l4", "l5", "l6"];
  loteKeys.forEach((lk, i) => {
    const lot = lotes[i];
    if (!lot) return;
    byKey[lk] = {
      ...byKey[lk],
      leitura1: lot.leituras?.[0] ?? lot.leitura1 ?? "",
      leitura2: lot.leituras?.[1] ?? "",
      leitura3: lot.leituras?.[2] ?? "",
      valor_nominal: lot.valor_nominal_carga ?? lot.valor_nominal ?? "",
      massa_especifica: lot.massa_especifica ?? "",
      temp: lot.temp ?? "",
      umidade: lot.umidade ?? "",
      pressao: lot.pressao ?? "",
    };
  });

  if (rawRep?.p1_valor_balanca) {
    byKey.p1 = { ...byKey.p1, leitura1: rawRep.p1_valor_balanca };
  }

  return SUBSTITUICAO_LINHA_DEFS.map((d) => byKey[d.key]);
}

export function applyEndCustomerToCliente(payload, endCustomer) {
  if (!endCustomer) return payload;
  return {
    ...payload,
    cliente: {
      ...payload.cliente,
      end_customer_id: endCustomer.id || "",
      cliente: endCustomer.name || "",
      responsavel: endCustomer.representative_name || "",
    },
  };
}

/** Resolve id de cliente cadastrado a partir do payload (id guardado ou nome). */
export function resolveEndCustomerId(payload, endCustomers = []) {
  const cid = payload?.cliente?.end_customer_id;
  if (cid && endCustomers.some((c) => c.id === cid)) return cid;
  const name = (payload?.cliente?.cliente || "").trim();
  if (!name) return "";
  const match = endCustomers.find((c) => (c.name || "").trim() === name);
  return match?.id || "";
}

export function emptyColetaPayload() {
  return {
    cliente: { cliente: "", responsavel: "", end_customer_id: "" },
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
      thermo_cert_id_2: "",
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
      observacoes: "",
      tbh_correction_raw: {},
      tbh_correction_meta: null,
      tbh_correction_applied: false,
    },
    excentricidade: {
      valor_aplicado: "",
      valor_aplicado_valor: "",
      valor_aplicado_unidade: "",
      pontos: Array.from({ length: 6 }, () => emptyEccPoint()),
    },
    controle: {
      representante_cliente: "",
      conferido_por: "",
      numero_certificado: "",
      nome_executor: "",
      executor_id: "",
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
        aplicavel: true,
        formacao_carga: "",
        massa_especifica_estimada: "",
        observacoes: "",
        p1_valor_balanca: "",
        linhas: emptySubstituicaoLinhas(),
      },
    },
  };
}

export function mergeColetaPayload(raw) {
  const base = emptyColetaPayload();
  if (!raw || typeof raw !== "object") return base;

  const migrateAmbiente = (a) => {
    const merged = { ...base.ambiente, ...(a || {}) };
    delete merged.climatizacao;
    if (merged.thermo_cert_id_2 == null) merged.thermo_cert_id_2 = "";
    if (merged.tbh_correction_raw == null || typeof merged.tbh_correction_raw !== "object") {
      merged.tbh_correction_raw = {};
    }
    if (merged.tbh_correction_applied == null) merged.tbh_correction_applied = false;
    if (merged.tbh_correction_meta == null) merged.tbh_correction_meta = null;
    return merged;
  };

  const migrateCalPoint = (pt, defaultUnit) => {
    const p = { ...emptyCalPoint(), ...(pt || {}) };
    delete p.identificacao_pesos;
    if (!Array.isArray(p.pesos_padrao_ids)) p.pesos_padrao_ids = [];

    const mass = resolveMassFields(p, {
      valorKey: "peso_nominal_valor",
      unidadeKey: "peso_nominal_unidade",
      legacyKey: "peso_nominal",
      defaultUnit,
    });
    p.peso_nominal_valor = sanitizeMassNumericInput(mass.valor);
    p.peso_nominal_unidade = mass.unidade;
    p.peso_nominal = formatMassDisplay(p.peso_nominal_valor, p.peso_nominal_unidade, { fallback: "" });

    p.leitura_antes = sanitizeMassNumericInput(p.leitura_antes);
    p.rep1 = sanitizeMassNumericInput(p.rep1);
    p.rep2 = sanitizeMassNumericInput(p.rep2);
    p.rep3 = sanitizeMassNumericInput(p.rep3);
    return p;
  };

  const migrateLinhaMass = (row, defaultUnit) => {
    const mass = resolveMassFields(row, {
      valorKey: "valor_nominal_valor",
      unidadeKey: "valor_nominal_unidade",
      legacyKey: "valor_nominal",
      defaultUnit,
    });
    return {
      ...row,
      valor_nominal_valor: sanitizeMassNumericInput(mass.valor),
      valor_nominal_unidade: mass.unidade,
      valor_nominal: formatMassDisplay(mass.valor, mass.unidade, { fallback: "" }),
    };
  };

  const balanca = { ...base.balanca, ...(raw.balanca || {}) };
  balanca.capacidade = sanitizeMassNumericInput(balanca.capacidade);
  balanca.resolucao = sanitizeMassNumericInput(balanca.resolucao);
  const defaultUnit = balanca.unidade || "g";

  const migrateEcc = () => {
    const ecc = raw.excentricidade || {};
    const mass = resolveMassFields(ecc, {
      valorKey: "valor_aplicado_valor",
      unidadeKey: "valor_aplicado_unidade",
      legacyKey: "valor_aplicado",
      defaultUnit,
    });
    return {
      valor_aplicado_valor: sanitizeMassNumericInput(mass.valor),
      valor_aplicado_unidade: mass.unidade,
      valor_aplicado: formatMassDisplay(mass.valor, mass.unidade, { fallback: "" }),
      pontos: Array.from({ length: 6 }, (_, i) => ({
        ...emptyEccPoint(),
        ...(ecc.pontos?.[i] || {}),
        antes: sanitizeMassNumericInput(ecc.pontos?.[i]?.antes),
        depois: sanitizeMassNumericInput(ecc.pontos?.[i]?.depois),
      })),
    };
  };

  const rawRep = raw.verso?.repetitividade || {};
  const linhas = migrateLotesToLinhas(rawRep).map((row) => migrateLinhaMass(row, defaultUnit));

  return {
    cliente: { ...base.cliente, ...(raw.cliente || {}) },
    balanca,
    ambiente: migrateAmbiente(raw.ambiente),
    excentricidade: migrateEcc(),
    controle: { ...base.controle, ...(raw.controle || {}) },
    calibracao: {
      pontos: Array.from({ length: 10 }, (_, i) => migrateCalPoint(raw.calibracao?.pontos?.[i], defaultUnit)),
    },
    verso: {
      descricao_carga: raw.verso?.descricao_carga ?? "",
      questoes_carga: {
        ...base.verso.questoes_carga,
        ...(raw.verso?.questoes_carga || {}),
      },
      repetitividade: {
        aplicavel: rawRep.aplicavel !== false,
        formacao_carga: rawRep.formacao_carga ?? "",
        massa_especifica_estimada: rawRep.massa_especifica_estimada ?? "",
        observacoes: rawRep.observacoes ?? "",
        p1_valor_balanca: rawRep.p1_valor_balanca ?? linhas.find((l) => l.key === "p1")?.leitura1 ?? "",
        linhas,
      },
    },
    ...(raw.meta && typeof raw.meta === "object" ? { meta: raw.meta } : {}),
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

export function weightItemLabel(w) {
  if (!w) return "—";
  const id = w.identification || "—";
  const val = w.nominal_value ? ` — ${w.nominal_value}` : "";
  const u = w.unit ? ` ${w.unit}` : "";
  return `${id}${val}${u}`.trim();
}

/** @deprecated use weightItemLabel — certificados de conjunto */
export function weightCertLabel(w) {
  if (!w) return "—";
  if (w.identification != null) return weightItemLabel(w);
  const parts = [w.set_name, w.certificate_number].filter(Boolean);
  const base = parts.join(" — ") || "Conjunto";
  return w.class ? `${base} (Classe ${w.class})` : base;
}

/** Rótulo completo (cadastros, listagens). */
export function envCertLabel(e) {
  if (!e) return "—";
  return [e.equipment_name, e.certificate_number].filter(Boolean).join(" — ") || "Equipamento";
}

/** Identificação do termo-baro na coleta, PDF e export VBA — só nome do equipamento. */
export function envCertIdentification(e) {
  if (!e) return "—";
  return (e.equipment_name || "").trim() || "Equipamento";
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

export function calPointNominalDisplay(pt, defaultUnit = "g") {
  return massDisplayFromRecord(pt, {
    valorKey: "peso_nominal_valor",
    unidadeKey: "peso_nominal_unidade",
    legacyKey: "peso_nominal",
    defaultUnit,
  });
}

export function syncCalPointNominal(pt, defaultUnit = "g") {
  const valor = sanitizeMassNumericInput(pt.peso_nominal_valor);
  const unidade = pt.peso_nominal_unidade || defaultUnit || "g";
  return {
    ...pt,
    peso_nominal_valor: valor,
    peso_nominal_unidade: unidade,
    peso_nominal: formatMassDisplay(valor, unidade, { fallback: "" }),
  };
}

export function syncEccValorAplicado(ecc, defaultUnit = "g") {
  const valor = sanitizeMassNumericInput(ecc.valor_aplicado_valor);
  const unidade = ecc.valor_aplicado_unidade || defaultUnit || "g";
  return {
    ...ecc,
    valor_aplicado_valor: valor,
    valor_aplicado_unidade: unidade,
    valor_aplicado: formatMassDisplay(valor, unidade, { fallback: "" }),
  };
}

export function syncLinhaValorNominal(row, defaultUnit = "g") {
  const valor = sanitizeMassNumericInput(row.valor_nominal_valor);
  const unidade = row.valor_nominal_unidade || defaultUnit || "g";
  return {
    ...row,
    valor_nominal_valor: valor,
    valor_nominal_unidade: unidade,
    valor_nominal: formatMassDisplay(valor, unidade, { fallback: "" }),
  };
}

export { formatMassDisplay, parseLegacyMassString, sanitizeMassNumericInput };

export function formatPesosIds(ids, weightItems) {
  if (!ids?.length || !weightItems?.length) return "";
  return ids
    .map((id) => weightItems.find((w) => w.id === id))
    .filter(Boolean)
    .map(weightItemLabel)
    .join("; ");
}

function parseNominalNumber(value) {
  if (value == null || value === "") return null;
  const n = Number(String(value).trim().replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function formatNominalPart(value, unit) {
  const n = parseNominalNumber(value);
  if (n == null) return String(value || "").trim();
  const u = (unit || "g").trim();
  return `${n} ${u}`.trim();
}

/** Deriva valor nominal de referência a partir dos pesos padrão selecionados. */
export function nominalFromWeightIds(ids, weightItems = [], preferConventional = false) {
  if (!ids?.length || !weightItems?.length) return "";
  const items = ids
    .map((id) => weightItems.find((w) => w.id === id))
    .filter(Boolean);
  if (!items.length) return "";

  const units = [...new Set(items.map((w) => (w.unit || "g").trim().toLowerCase()))];
  if (units.length === 1) {
    const sum = items.reduce((acc, w) => {
      const raw = preferConventional && w.conventional_value ? w.conventional_value : w.nominal_value;
      return acc + (parseNominalNumber(raw) || 0);
    }, 0);
    if (sum > 0) return `${sum} ${items[0].unit || "g"}`.trim();
  }

  return items.map((w) => {
    const raw = preferConventional && w.conventional_value ? w.conventional_value : w.nominal_value;
    return formatNominalPart(raw, w.unit);
  }).join(" + ");
}
