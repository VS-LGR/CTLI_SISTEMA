import {
  mergeColetaPayload,
  SUBSTITUICAO_LINHA_DEFS,
  envCertLabel,
  formatPesosIds,
} from "./coletaSchema";
import { coletaDocMetaFromTenant } from "./coletaDocMeta";

export function buildColetaDocumentModel(row, tenantName = "", tenant = null) {
  const p = mergeColetaPayload(row?.payload);
  const prop = row?.commercial_proposal_ref || "";
  const meta = coletaDocMetaFromTenant(tenant);
  return {
    tenantName,
    commercialProposalRef: prop,
    payload: p,
    header: {
      title: "COLETA DE DADOS PARA CALIBRAÇÃO DE BALANÇA",
      code: `Cód. ${meta.code}  Ref. ${meta.ref}  ${meta.revision}`,
      proposal: prop ? `Referente à Proposta Comercial: ${prop}` : "Referente à Proposta Comercial:",
    },
  };
}

function fileSlug(row) {
  const serial = row?.scale_serial || "coleta";
  const date = row?.calibration_date || new Date().toISOString().slice(0, 10);
  return `${serial}-${date}`.replace(/[^a-zA-Z0-9_-]/g, "_");
}

/** Carrega html2canvas/jspdf/templates só ao exportar (evita TDZ no bundle principal). */
export async function exportColetaPdf(
  row,
  tenantName = "",
  { logoDataUrl, envCerts = [], weightItems = [], tenant = null } = {},
) {
  const { renderColetaPdf } = await import(
    /* webpackChunkName: "coleta-pdf" */ "./coletaPdf/renderToPdf"
  );
  await renderColetaPdf(row, tenantName, { logoDataUrl, envCerts, weightItems, tenant });
}

function tsvEscape(val) {
  const s = val == null ? "" : String(val);
  return s.replace(/\t/g, " ").replace(/\r?\n/g, " ");
}

function buildTsvRow(row, envCerts, weightItems) {
  const p = mergeColetaPayload(row?.payload);
  const cols = [];

  const push = (v) => cols.push(tsvEscape(v));

  push(row?.commercial_proposal_ref || "");
  push(p.cliente.cliente);
  push(p.cliente.responsavel);

  [
    "fabricante", "modelo", "serie", "tag", "local", "etiqueta_ipem", "portaria_inmetro",
    "capacidade", "resolucao", "unidade", "tipo_balanca", "tipo_balanca_outros", "tipo_plataforma",
  ].forEach((k) => push(p.balanca[k]));

  push(p.ambiente.thermo_cert_id);
  push(envCertLabel(envCerts.find((e) => e.id === p.ambiente.thermo_cert_id)));
  [
    "horario_inicial", "horario_final", "temp_inicial", "temp_final",
    "umidade_inicial", "umidade_final", "pressao_inicial", "pressao_final",
    "balanca_ajustada", "balanca_nivelada", "existe_vibracao", "existe_corrente_ar",
  ].forEach((k) => push(p.ambiente[k]));

  push(p.excentricidade.valor_aplicado);
  p.excentricidade.pontos.forEach((pt) => {
    push(pt.antes);
    push(pt.depois);
  });

  [
    "representante_cliente", "conferido_por", "numero_certificado", "nome_executor",
    "data_calibracao", "pontos_solicitados",
  ].forEach((k) => push(p.controle[k]));

  p.calibracao.pontos.forEach((pt) => {
    push(pt.peso_nominal);
    push(pt.leitura_antes);
    push(pt.rep1);
    push(pt.rep2);
    push(pt.rep3);
    push((pt.pesos_padrao_ids || []).join("|"));
    push(formatPesosIds(pt.pesos_padrao_ids, weightItems));
  });

  push(p.verso.descricao_carga);
  push(p.verso.questoes_carga.facil_manuseio);
  push(p.verso.questoes_carga.facil_centro_gravidade);
  push(p.verso.questoes_carga.massa_constante);
  push(p.verso.repetitividade.aplicavel === false ? "nao" : "sim");
  push(p.verso.repetitividade.formacao_carga);
  push(p.verso.repetitividade.massa_especifica_estimada);
  push(p.verso.repetitividade.observacoes);

  const linhasByKey = Object.fromEntries((p.verso.repetitividade.linhas || []).map((l) => [l.key, l]));
  SUBSTITUICAO_LINHA_DEFS.forEach((def) => {
    const ln = linhasByKey[def.key] || {};
    push(ln.leitura1);
    push(def.leituras3 ? ln.leitura2 : "");
    push(def.leituras3 ? ln.leitura3 : "");
    push(ln.valor_nominal);
    push(ln.massa_especifica);
    push(ln.temp);
    push(ln.umidade);
    push(ln.pressao);
  });

  return cols;
}

export function buildTsvHeaders() {
  const h = [
    "proposta_comercial", "cliente", "responsavel",
    "fabricante", "modelo", "serie", "tag", "local", "etiqueta_ipem", "portaria_inmetro",
    "capacidade", "resolucao", "unidade", "tipo_balanca", "tipo_balanca_outros", "tipo_plataforma",
    "thermo_cert_id", "thermo_identificacao",
    "horario_inicial", "horario_final", "temp_inicial", "temp_final",
    "umidade_inicial", "umidade_final", "pressao_inicial", "pressao_final",
    "balanca_ajustada", "balanca_nivelada", "existe_vibracao", "existe_corrente_ar",
    "excentricidade_valor_aplicado",
  ];
  for (let i = 1; i <= 6; i += 1) {
    h.push(`ecc_p${i}_antes`, `ecc_p${i}_depois`);
  }
  h.push(
    "representante_cliente", "conferido_por", "numero_certificado", "nome_executor",
    "data_calibracao", "pontos_solicitados",
  );
  for (let i = 1; i <= 10; i += 1) {
    h.push(
      `cal_p${i}_peso_nominal`, `cal_p${i}_leitura_antes`, `cal_p${i}_rep1`, `cal_p${i}_rep2`, `cal_p${i}_rep3`,
      `cal_p${i}_pesos_ids`, `cal_p${i}_pesos_label`,
    );
  }
  h.push(
    "verso_descricao_carga",
    "questao_facil_manuseio", "questao_centro_gravidade", "questao_massa_constante",
    "rep_aplicavel", "rep_formacao_carga", "rep_massa_especifica_estimada", "rep_observacoes",
  );
  SUBSTITUICAO_LINHA_DEFS.forEach((def) => {
    const k = def.key;
    h.push(
      `rep_${k}_leitura1`, `rep_${k}_leitura2`, `rep_${k}_leitura3`,
      `rep_${k}_valor_nominal`, `rep_${k}_massa_especifica`,
      `rep_${k}_temp`, `rep_${k}_umidade`, `rep_${k}_pressao`,
    );
  });
  return h;
}

export function exportColetaTsv(row, { envCerts = [], weightItems = [] } = {}) {
  const headers = buildTsvHeaders();
  const values = buildTsvRow(row, envCerts, weightItems);
  const bom = "\uFEFF";
  const content = `${bom}${headers.join("\t")}\n${values.join("\t")}\n`;
  const blob = new Blob([content], { type: "text/tab-separated-values;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `coleta-${fileSlug(row)}.txt`;
  a.click();
  URL.revokeObjectURL(a.href);
}
