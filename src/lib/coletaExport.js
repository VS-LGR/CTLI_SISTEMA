import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  mergeColetaPayload,
  SUBSTITUICAO_LINHA_DEFS,
  triStateLabel,
  binaryLabel,
  simNaoLabel,
  tipoBalancaLabel,
  tipoPlataformaLabel,
  unidadeLabel,
  envCertLabel,
  formatPesosIds,
} from "./coletaSchema";
import { coletaDocMetaFromTenant } from "./coletaDocMeta";

const LOGO_COL_MM = 26;
const MARGIN = 10;

function fmtDmy(isoDate) {
  if (!isoDate) return "";
  const [y, m, d] = String(isoDate).split("-");
  if (!y || !m || !d) return isoDate;
  return `${d}/${m}/${y}`;
}

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

function contentLeft(logoDataUrl) {
  return logoDataUrl ? MARGIN + LOGO_COL_MM : MARGIN;
}

function drawLogo(doc, logoDataUrl) {
  if (!logoDataUrl) return;
  try {
    doc.addImage(logoDataUrl, "PNG", MARGIN, 12, LOGO_COL_MM - 4, 18, undefined, "FAST");
  } catch {
    try {
      doc.addImage(logoDataUrl, "JPEG", MARGIN, 12, LOGO_COL_MM - 4, 18);
    } catch {
      /* ignore */
    }
  }
}

function drawHeader(doc, model, yStart, logoDataUrl) {
  const cx = 105;
  let y = yStart;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  if (model.header.proposal) {
    doc.text(model.header.proposal, cx, y, { align: "center" });
    y += 5;
  }
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(model.header.title, cx, y, { align: "center" });
  y += 5;
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(model.header.code, cx, y, { align: "center" });
  return y + 8;
}

function kvRows(pairs) {
  return pairs.filter(([, v]) => v !== undefined);
}

export function exportColetaPdf(row, tenantName = "", { logoDataUrl, envCerts = [], weightItems = [], tenant = null } = {}) {
  const model = buildColetaDocumentModel(row, tenantName, tenant);
  const p = model.payload;
  const left = contentLeft(logoDataUrl);
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  drawLogo(doc, logoDataUrl);
  let y = drawHeader(doc, model, 12, logoDataUrl);

  const section = (num, title) => {
    if (y > 265) {
      doc.addPage();
      drawLogo(doc, logoDataUrl);
      y = drawHeader(doc, model, 12, logoDataUrl);
    }
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(`${num}) ${title}`, left, y);
    y += 5;
  };

  const table = (head, body) => {
    autoTable(doc, {
      startY: y,
      margin: { left, right: MARGIN },
      head: [head],
      body,
      styles: { fontSize: 7, cellPadding: 1.2 },
      headStyles: { fillColor: [241, 245, 249], textColor: 30 },
    });
    y = doc.lastAutoTable.finalY + 4;
  };

  const thermoLabel = p.ambiente.thermo_cert_id
    ? envCertLabel(envCerts.find((e) => e.id === p.ambiente.thermo_cert_id))
    : "";

  section(1, "Dados do Cliente");
  table(["Campo", "Valor"], [
    ["Cliente", p.cliente.cliente],
    ["Responsável", p.cliente.responsavel],
  ]);

  section(2, "Informações da Balança");
  table(["Campo", "Valor"], kvRows([
    ["Fabricante", p.balanca.fabricante],
    ["Modelo", p.balanca.modelo],
    ["Nº de série", p.balanca.serie],
    ["Tag", p.balanca.tag],
    ["Local", p.balanca.local],
    ["Etiqueta IPEM", p.balanca.etiqueta_ipem],
    ["Portaria Inmetro", p.balanca.portaria_inmetro],
    ["Capacidade", p.balanca.capacidade],
    ["Resolução", p.balanca.resolucao],
    ["Unidade", unidadeLabel(p.balanca.unidade)],
    ["Tipo de balança", tipoBalancaLabel(p.balanca.tipo_balanca, p.balanca.tipo_balanca_outros)],
    ["Tipo de plataforma", tipoPlataformaLabel(p.balanca.tipo_plataforma)],
  ]));

  section(3, "Condições Ambientais Durante a Calibração");
  table(["Campo", "Valor"], kvRows([
    ["Identificação (termo)", thermoLabel],
    ["Horário inicial", p.ambiente.horario_inicial],
    ["Horário final", p.ambiente.horario_final],
    ["Temp. inicial (°C)", p.ambiente.temp_inicial],
    ["Temp. final (°C)", p.ambiente.temp_final],
    ["Umidade inicial (%ur)", p.ambiente.umidade_inicial],
    ["Umidade final (%ur)", p.ambiente.umidade_final],
    ["Pressão inicial (hPa)", p.ambiente.pressao_inicial],
    ["Pressão final (hPa)", p.ambiente.pressao_final],
    ["Balança ajustada", triStateLabel(p.ambiente.balanca_ajustada)],
    ["Balança nivelada", triStateLabel(p.ambiente.balanca_nivelada)],
    ["Vibração", binaryLabel(p.ambiente.existe_vibracao)],
    ["Corrente de ar", binaryLabel(p.ambiente.existe_corrente_ar)],
  ]));

  section(4, "Ensaio de Excentricidade");
  table(
    ["Ponto", "Antes", "Depois"],
    p.excentricidade.pontos.map((pt, i) => [
      String(i + 1),
      pt.antes,
      pt.depois,
    ]),
  );
  doc.setFontSize(8);
  doc.text(`Valor aplicado: ${p.excentricidade.valor_aplicado || "—"}`, left, y);
  y += 6;

  section(5, "Controle");
  table(["Campo", "Valor"], kvRows([
    ["Representante do Cliente", p.controle.representante_cliente],
    ["Conferido por", p.controle.conferido_por],
    ["Nº certificado", p.controle.numero_certificado],
    ["Executor", p.controle.nome_executor],
    ["Data calibração", fmtDmy(p.controle.data_calibracao)],
    ["Pontos solicitados", p.controle.pontos_solicitados === "sim" ? "SIM" : p.controle.pontos_solicitados === "nao" ? "NÃO" : ""],
  ]));

  section(6, "Calibração da Balança");
  table(
    ["Ponto", "Peso nominal", "Antes", "L1", "L2", "L3", "Pesos padrão"],
    p.calibracao.pontos.map((pt, i) => [
      `P${i + 1}`,
      pt.peso_nominal,
      pt.leitura_antes,
      pt.rep1,
      pt.rep2,
      pt.rep3,
      formatPesosIds(pt.pesos_padrao_ids, weightItems),
    ]),
  );

  doc.addPage();
  drawLogo(doc, logoDataUrl);
  y = drawHeader(doc, model, 12, logoDataUrl);

  const v = p.verso;
  const q = v.questoes_carga;
  const rep = v.repetitividade;

  section(1, "Descrição da Carga");
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  const descLines = doc.splitTextToSize(v.descricao_carga || "—", 210 - left - MARGIN);
  doc.text(descLines, left, y);
  y += descLines.length * 4 + 4;

  section(2, "Questões sobre a carga");
  table(["Questão", "Resposta"], [
    ["2.1 Fácil manuseio", simNaoLabel(q.facil_manuseio)],
    ["2.2 Centro de gravidade", simNaoLabel(q.facil_centro_gravidade)],
    ["2.3 Massa constante", simNaoLabel(q.massa_constante)],
  ]);

  section(3, "Repetitividade com Carga de Substituição");
  if (rep.aplicavel === false) {
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.text("Ensaio não aplicável.", left, y);
    y += 6;
  } else {
    table(["Campo", "Valor"], kvRows([
      ["Formação da carga", rep.formacao_carga],
      ["Massa específica estimada", rep.massa_especifica_estimada],
      ["Observações", rep.observacoes],
    ]));
  }

  const linhasByKey = Object.fromEntries((rep.linhas || []).map((l) => [l.key, l]));
  table(
    ["Linha", "Leitura 1", "Leitura 2", "Leitura 3", "Valor nominal", "Massa esp.", "°C", "%ur", "hPa"],
    SUBSTITUICAO_LINHA_DEFS.map((def) => {
      const ln = linhasByKey[def.key] || {};
      return [
        def.label,
        ln.leitura1 || "",
        def.leituras3 ? (ln.leitura2 || "") : "",
        def.leituras3 ? (ln.leitura3 || "") : "",
        ln.valor_nominal || "",
        ln.massa_especifica || "",
        ln.temp || "",
        ln.umidade || "",
        ln.pressao || "",
      ];
    }),
  );

  doc.save(`coleta-${fileSlug(row)}.pdf`);
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
  p.excentricidade.pontos.forEach((pt, i) => {
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
