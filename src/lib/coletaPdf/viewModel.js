import {
  mergeColetaPayload,
  SUBSTITUICAO_LINHA_DEFS,
  isSubstituicaoLinhaSoloL,
  envCertIdentification,
  formatPesosIds,
} from "../coletaSchema";
import { coletaDocMetaFromTenant } from "../coletaDocMeta";

export function fmtDmy(isoDate) {
  if (!isoDate) return "";
  const [y, m, d] = String(isoDate).split("-");
  if (!y || !m || !d) return isoDate;
  return `${d}/${m}/${y}`;
}

export function buildColetaPdfViewModel(
  row,
  tenantName = "",
  { envCerts = [], weightItems = [], tenant = null } = {},
) {
  const p = mergeColetaPayload(row?.payload);
  const meta = coletaDocMetaFromTenant(tenant);
  const prop = row?.commercial_proposal_ref || "";

  const thermoLabel = p.ambiente.thermo_cert_id
    ? envCertIdentification(envCerts.find((e) => e.id === p.ambiente.thermo_cert_id))
    : "";
  const thermoLabel2 = p.ambiente.thermo_cert_id_2
    ? envCertIdentification(envCerts.find((e) => e.id === p.ambiente.thermo_cert_id_2))
    : "";

  const calibracaoRows = p.calibracao.pontos.map((pt, i) => ({
    label: `P${i + 1}`,
    pesoNominal: pt.peso_nominal ?? "",
    antes: pt.leitura_antes ?? "",
    rep1: pt.rep1 ?? "",
    rep2: pt.rep2 ?? "",
    rep3: pt.rep3 ?? "",
    pesos: formatPesosIds(pt.pesos_padrao_ids, weightItems),
  }));

  const linhasByKey = Object.fromEntries(
    (p.verso.repetitividade.linhas || []).map((l) => [l.key, l]),
  );

  const substituicaoRows = SUBSTITUICAO_LINHA_DEFS.map((def) => {
    const ln = linhasByKey[def.key] || {};
    const soloL = isSubstituicaoLinhaSoloL(def);
    const dash = "-";
    return {
      label: def.label,
      leituras3: def.leituras3,
      soloL,
      leitura1: ln.leitura1 ?? "",
      leitura2: def.leituras3 ? (ln.leitura2 ?? "") : "",
      leitura3: def.leituras3 ? (ln.leitura3 ?? "") : "",
      valorNominal: ln.valor_nominal ?? "",
      massaEspecifica: soloL ? dash : (ln.massa_especifica ?? ""),
      temp: soloL ? dash : (ln.temp ?? ""),
      umidade: soloL ? dash : (ln.umidade ?? ""),
      pressao: soloL ? dash : (ln.pressao ?? ""),
    };
  });

  return {
    tenantName,
    commercialProposalRef: prop,
    header: {
      title: "COLETA DE DADOS PARA CALIBRAÇÃO DE BALANÇA",
      codeLine: `Cód. ${meta.code}  Ref. ${meta.ref}  ${meta.revision}`,
      proposalLine: prop
        ? `Referente à Proposta Comercial: ${prop}`
        : "Referente à Proposta Comercial:",
    },
    footer: {
      code: meta.code,
      ref: meta.ref,
      revision: meta.revision,
    },
    cliente: p.cliente,
    balanca: p.balanca,
    ambiente: { ...p.ambiente, thermoLabel, thermoLabel2 },
    excentricidade: p.excentricidade,
    controle: {
      ...p.controle,
      data_calibracao_fmt: fmtDmy(p.controle.data_calibracao),
    },
    calibracaoRows,
    verso: {
      descricao_carga: p.verso.descricao_carga ?? "",
      questoes: p.verso.questoes_carga,
      repetitividade: p.verso.repetitividade,
      substituicaoRows,
    },
  };
}

export function coletaPdfFileSlug(row) {
  const serial = row?.scale_serial || "coleta";
  const date = row?.calibration_date || new Date().toISOString().slice(0, 10);
  return `${serial}-${date}`.replace(/[^a-zA-Z0-9_-]/g, "_");
}
