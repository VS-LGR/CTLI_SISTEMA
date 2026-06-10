import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  TIPO_BALANCA_OPTIONS,
  TIPO_PLATAFORMA_OPTIONS,
  unidadeLabel,
} from "../coletaSchema";
import { buildColetaPdfViewModel, coletaPdfFileSlug } from "./viewModel";
import { drawInstitutionalPageFooters } from "@/lib/institutionalPdf/drawPageFooters";
import {
  FORM_COLORS,
  drawSectionBar,
  drawDualSectionBar,
  drawProposalBox,
  drawEquipamentoRow,
  drawFieldGrid,
  drawMeasureBlock,
  drawDescricaoBox,
  fieldLabelWithColon,
  tableHeadStyles,
} from "./coletaPdfLayout";

const ML = 10;
const MR = 200;
const CW = MR - ML;
const PAGE_W = 210;

function s(v) {
  return v == null ? "" : String(v);
}

function mark(checked) {
  return checked ? "X" : " ";
}

const LOGO_W = 32;
const LOGO_H = 13;
const PROP_W = 46;
const CTRL_ROW_H = 5;
const PROP_X = MR - PROP_W;
const CENTER_X = ML + LOGO_W + 3;
const CENTER_W = PROP_X - CENTER_X - 3;
const CENTER_MID = CENTER_X + CENTER_W / 2;

let headerContentStartY = 28;

function drawHeader(doc, model, logoDataUrl) {
  const propRef = model.commercialProposalRef || "";
  const headerTop = 6;

  const propH = drawProposalBox(doc, PROP_X, headerTop, PROP_W, propRef);

  let logoBottom = headerTop;
  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, "PNG", ML, headerTop, LOGO_W, LOGO_H);
      logoBottom = headerTop + LOGO_H;
    } catch {
      /* logo do tenant opcional */
    }
  }

  doc.setTextColor(...FORM_COLORS.text);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  const titleY = headerTop + 9;
  doc.text("COLETA DE DADOS PARA CALIBRAÇÃO DE BALANÇA", CENTER_MID, titleY, {
    align: "center",
    maxWidth: CENTER_W,
  });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text(model.header.codeLine, CENTER_MID, titleY + 4.5, {
    align: "center",
    maxWidth: CENTER_W,
  });

  const titleBottom = titleY + 8;
  const bandBottom = Math.max(headerTop + propH, logoBottom, titleBottom);
  headerContentStartY = bandBottom + 4;
}

function contentStartY() {
  return headerContentStartY;
}

function underlineField(doc, x, y, label, value, width) {
  doc.setFontSize(8);
  doc.setTextColor(...FORM_COLORS.text);
  const lbl = fieldLabelWithColon(label);
  doc.text(lbl, x, y);
  const x0 = x + doc.getTextWidth(lbl);
  const x1 = x + width;
  const lineY = y + 1.1;
  doc.setDrawColor(...FORM_COLORS.border);
  doc.line(x0, lineY, x1, lineY);
  const val = s(value);
  if (val) doc.text(val, x0 + 0.5, y);
}

function drawMultilineField(doc, x, y, label, value, width, maxLines = 2) {
  doc.setFontSize(7.5);
  doc.setTextColor(...FORM_COLORS.text);

  const lbl = fieldLabelWithColon(label);
  doc.text(lbl, x, y);
  const x0 = x + doc.getTextWidth(lbl);
  const x1 = x + width;

  const underlineY = y + 1.0;
  doc.setDrawColor(...FORM_COLORS.border);
  doc.setLineWidth(0.1);
  doc.line(x0, underlineY, x1, underlineY);

  const rawVal = s(value);
  const valText = rawVal ? rawVal : " ";
  const valWidth = Math.max(10, width - (x0 - x) - 1);
  const lines = doc.splitTextToSize(valText, valWidth);
  const take = lines.length ? lines.slice(0, maxLines) : [" "];

  const lineStep = 3.2;
  take.forEach((line, i) => {
    doc.text(line, x0 + 0.5, y + i * lineStep);
  });

  return y + (take.length - 1) * lineStep + 6;
}

function checkboxGroup(doc, x, y, items, maxWidth = CW) {
  doc.setFontSize(7.5);
  let cx = x;
  let cy = y;
  items.forEach((item) => {
    const t = `(${mark(item.checked)}) ${item.label}`;
    const w = doc.getTextWidth(t) + 3;
    if (cx + w > x + maxWidth && cx > x) {
      cx = x;
      cy += 3.5;
    }
    doc.text(t, cx, cy);
    cx += w;
  });
  return cy + 4;
}

function triState(doc, x, y, label, value) {
  doc.setFontSize(7.5);
  doc.text(`* ${label} `, x, y);
  let cx = x + doc.getTextWidth(`* ${label} `);
  [
    { v: "sim", l: "sim" },
    { v: "nao", l: "não" },
    { v: "na", l: "não disponível" },
  ].forEach((o) => {
    const t = `(${mark(value === o.v)}) ${o.l}  `;
    doc.text(t, cx, y);
    cx += doc.getTextWidth(t);
  });
  return y + 4.2;
}

function binaryRow(doc, x, y, label, value) {
  doc.setFontSize(7.5);
  doc.text(`* ${label} `, x, y);
  let cx = x + doc.getTextWidth(`* ${label} `);
  ["sim", "nao"].forEach((v) => {
    const t = `(${mark(value === v)}) ${v === "sim" ? "sim" : "não"}  `;
    doc.text(t, cx, y);
    cx += doc.getTextWidth(t);
  });
  return y + 4.2;
}

function drawFrente(doc, model) {
  let y = contentStartY();
  y = drawSectionBar(doc, ML, y, CW, "1) Dados do Cliente");
  underlineField(doc, ML, y, "Cliente", model.cliente.cliente, CW);
  y += 5;
  underlineField(doc, ML, y, "Resposável", model.cliente.responsavel, CW);
  y += 7;

  y = drawSectionBar(doc, ML, y, CW, "2) Informações da Balança");
  const bal = model.balanca;
  y = drawFieldGrid(doc, ML, y, CW, 5, [
    { label: "Fabricante:", value: bal.fabricante },
    { label: "Modelo:", value: bal.modelo },
    { label: "Nº de série:", value: bal.serie },
    { label: "Tag / Codigo Interno:", value: bal.tag },
    { label: "Local da Calibração:", value: bal.local },
    { label: "Etiqueta IPEM:", value: bal.etiqueta_ipem },
    { label: "Portaria Inmetro:", value: bal.portaria_inmetro },
    { label: "Capacidade:", value: bal.capacidade },
    { label: "Resolução:", value: bal.resolucao },
    { label: "Unidade:", value: unidadeLabel(bal.unidade) },
  ]);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...FORM_COLORS.text);
  doc.text("Tipo de balança:", ML, y);
  doc.setFont("helvetica", "normal");
  y = checkboxGroup(
    doc,
    ML + 22,
    y,
    TIPO_BALANCA_OPTIONS.map((opt) => ({
      checked: bal.tipo_balanca === opt.value,
      label: opt.label,
    })).concat([
      {
        checked: bal.tipo_balanca === "outros",
        label: `Outros: ${bal.tipo_balanca === "outros" ? s(bal.tipo_balanca_outros) : "__________"}`,
      },
    ]),
    CW - 22,
  );
  doc.setFont("helvetica", "bold");
  doc.text("Tipo de plataforma:", ML, y);
  doc.setFont("helvetica", "normal");
  y = checkboxGroup(
    doc,
    ML + 28,
    y,
    TIPO_PLATAFORMA_OPTIONS.map((opt) => ({
      checked: bal.tipo_plataforma === opt.value,
      label: opt.label,
    })),
    CW - 28,
  );
  y += 2;

  y = drawSectionBar(doc, ML, y, CW, "3) Condições Ambientais Durante a Calibração");
  const amb = model.ambiente;
  const colR = ML + 98;
  const colRW = MR - colR;
  const ambLeftW = colR - ML - 3;
  const yAmbStart = y;

  let yLeft = yAmbStart;
  yLeft = drawEquipamentoRow(
    doc,
    ML,
    yLeft,
    ambLeftW,
    "Climatização dos pesos-padrão e termo-baro-higrômetro (1):",
    amb.thermoLabel,
  );
  yLeft = drawEquipamentoRow(
    doc,
    ML,
    yLeft,
    ambLeftW,
    "Termo-baro-higrômetro (2):",
    amb.thermoLabel2,
  );
  yLeft += 1;
  doc.setFontSize(7.5);
  doc.setTextColor(...FORM_COLORS.text);
  doc.text(
    `Horário inicial: ${s(amb.horario_inicial)}    Horário final: ${s(amb.horario_final)}`,
    ML + 2,
    yLeft,
  );
  yLeft += 5;
  yLeft = triState(doc, ML, yLeft, "A balança foi ajustada ?", amb.balanca_ajustada);
  yLeft = triState(doc, ML, yLeft, "A balança foi nivelada?", amb.balanca_nivelada);
  yLeft = binaryRow(doc, ML, yLeft, "Existe vibração no local?", amb.existe_vibracao);
  yLeft = binaryRow(doc, ML, yLeft, "Existe corrente de ar no local?", amb.existe_corrente_ar);

  let yR = yAmbStart;
  yR = drawMeasureBlock(
    doc,
    colR,
    yR,
    colRW,
    "Temperatura (t) corrigida",
    `Inicial: ${s(amb.temp_inicial)} °C    Final: ${s(amb.temp_final)} °C`,
  );
  yR = drawMeasureBlock(
    doc,
    colR,
    yR,
    colRW,
    "Umidade relativa (h) corrigida",
    `Inicial: ${s(amb.umidade_inicial)} %ur    Final: ${s(amb.umidade_final)} %ur`,
  );
  yR = drawMeasureBlock(
    doc,
    colR,
    yR,
    colRW,
    "Pressão atmosférica (P) corrigida",
    `Inicial: ${s(amb.pressao_inicial)} hPa    Final: ${s(amb.pressao_final)} hPa`,
  );
  y = Math.max(yLeft, yR) + 4;

  y = drawMultilineField(doc, ML, y, "Observações", amb.observacoes, CW, 2) + 1;

  y = drawDualSectionBar(
    doc,
    ML,
    y,
    "4) Ensaio de Excentricidade",
    "5) Controle",
    88,
    92,
    10,
  );

  const ecc = model.excentricidade;
  const ctrl = model.controle;
  const ySec = y;
  doc.setFontSize(8);
  doc.text(`Valor Aplicado: ${s(ecc.valor_aplicado)}`, ML, ySec);
  underlineField(doc, ML + 98, ySec, "Representante do Cliente", ctrl.representante_cliente, 92);
  let yCtrl = ySec + CTRL_ROW_H;
  const yEccTable = ySec + 6;

  const th = tableHeadStyles(doc);
  autoTable(doc, {
    startY: yEccTable,
    margin: { left: ML, right: PAGE_W - ML - 98 },
    tableWidth: 88,
    head: [["Ponto", "Antes do ajuste", "Depois do ajuste"]],
    body: ecc.pontos.map((pt, i) => [String(i + 1), s(pt.antes), s(pt.depois)]),
    styles: { fontSize: 7, cellPadding: 1.2, lineWidth: 0.1 },
    headStyles: th,
    theme: "grid",
  });

  const ctrlFields = [
    ["Conferido e Transcrito por", ctrl.conferido_por],
    ["Número do Certificado Emitido", ctrl.numero_certificado],
    ["Nome do Executor", ctrl.nome_executor],
    ["Data da Calibração", ctrl.data_calibracao_fmt],
  ];
  ctrlFields.forEach(([lbl, val]) => {
    underlineField(doc, ML + 98, yCtrl, lbl, val, 92);
    yCtrl += CTRL_ROW_H;
  });
  doc.setFontSize(7.5);
  doc.setTextColor(...FORM_COLORS.text);
  doc.text("Pontos de Calibração Solicitados pelo Cliente", ML + 98, yCtrl);
  checkboxGroup(
    doc,
    ML + 98,
    yCtrl + 3.5,
    [
      { checked: ctrl.pontos_solicitados === "sim", label: "SIM" },
      { checked: ctrl.pontos_solicitados === "nao", label: "NÃO" },
    ],
    50,
  );

  const yAfterEcc = doc.lastAutoTable.finalY + 3;
  y = Math.max(yAfterEcc, yCtrl + 10);

  y = drawSectionBar(doc, ML, y, CW, "6) Calibração da Balança");
  doc.setFontSize(8);
  doc.setTextColor(...FORM_COLORS.text);
  doc.text("Ensaio de Repetitividade", ML + 72, y);
  y += 5;

  autoTable(doc, {
    startY: y,
    margin: { left: ML, right: ML },
    head: [
      [
        "",
        "Valor nominal do Peso de Referência aplicado",
        "Leitura antes do ajuste",
        "Leitura 1",
        "Leitura 2",
        "Leitura 3",
        "Identificação do(s) Peso(s) Padrão de Referência aplicado",
      ],
    ],
    body: model.calibracaoRows.map((row) => [
      row.label,
      s(row.pesoNominal),
      s(row.antes),
      s(row.rep1),
      s(row.rep2),
      s(row.rep3),
      s(row.pesos),
    ]),
    styles: { fontSize: 6.5, cellPadding: 1.4, lineWidth: 0.1, overflow: "linebreak" },
    headStyles: { ...th, fontSize: 6 },
    columnStyles: {
      0: { cellWidth: 8 },
      1: { cellWidth: 28 },
      2: { cellWidth: 22 },
      3: { cellWidth: 18 },
      4: { cellWidth: 18 },
      5: { cellWidth: 18 },
      6: { cellWidth: "auto" },
    },
    theme: "grid",
  });
}

function drawVerso(doc, model) {
  if (!model.verso.repetitividadeAplicavel) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...FORM_COLORS.text);
    doc.text(
      "Ensaio de repetitividade com lote de carga não aplicável.",
      PAGE_W / 2,
      120,
      { align: "center" },
    );
    return;
  }

  let y = contentStartY();
  y = drawSectionBar(doc, ML, y, CW, "1) Descrição da Carga");
  const boxH = 27;
  y = drawDescricaoBox(doc, ML, y, CW, boxH, model.verso.descricao_carga) + 4;

  y = drawSectionBar(doc, ML, y, CW, "2) Questões sobre a Carga");
  const q = model.verso.questoes;
  doc.setFontSize(8);
  doc.setTextColor(...FORM_COLORS.text);
  [
    ["2.1 - A Carga é de fácil manuseio?", q.facil_manuseio],
    ["2.2 - É fácil estimar o centro de gravidade da Carga?", q.facil_centro_gravidade],
    [
      "2.3 - A Carga permaneceu com sua massa constante durante a calibração?",
      q.massa_constante,
    ],
  ].forEach(([text, val]) => {
    doc.text(text, ML + 2, y);
    checkboxGroup(
      doc,
      ML + 2,
      y + 3.5,
      [
        { checked: val === "sim", label: "Sim" },
        { checked: val === "nao", label: "Não" },
      ],
      40,
    );
    y += 11;
  });

  y = drawSectionBar(doc, ML, y, CW, "3) Repetitividade com Lote de Carga");
  y += 3;

  const th = tableHeadStyles(doc);
  autoTable(doc, {
    startY: y,
    margin: { left: ML, right: ML },
    head: [
      [
        { content: "Linha", rowSpan: 2 },
        { content: "Valor nominal\nda carga", rowSpan: 2 },
        { content: "Depois do ajuste", colSpan: 3 },
        { content: "Massa específica\nestimada da carga\n(kg/m³)", rowSpan: 2 },
        { content: "Temperatura (t)\ncorrigida (ºC)", rowSpan: 2 },
        { content: "Umidade relativa (h)\ncorrigida (%ur)", rowSpan: 2 },
        { content: "Pressão atmosférica (P)\ncorrigida (hPa)", rowSpan: 2 },
      ],
      ["Leitura 1", "Leitura 2", "Leitura 3"],
    ],
    body: model.verso.substituicaoRows.map((row) => [
      row.label,
      s(row.valorNominal),
      s(row.leitura1),
      row.leituras3 ? s(row.leitura2) : "",
      row.leituras3 ? s(row.leitura3) : "",
      s(row.massaEspecifica),
      s(row.temp),
      s(row.umidade),
      s(row.pressao),
    ]),
    styles: { fontSize: 6.5, cellPadding: 1.4, lineWidth: 0.1, halign: "center", valign: "middle" },
    headStyles: { ...th, fontSize: 6 },
    theme: "grid",
  });

  y = doc.lastAutoTable.finalY + 5;
  doc.setFontSize(6.5);
  doc.text(
    "* NOTA IMPORTANTE: O VALOR CONSIDERADO PARA P1 É O VALOR INDICADO PELA BALANÇA PARA A CARGA EM PESOS-PADRÃO QUE DARÁ PARTIDA AOS LOTES. L = Lote de carga",
    ML,
    y,
    { maxWidth: CW },
  );
  y += 10;
  doc.setFontSize(8);
  doc.text("Observações:", ML, y);
  underlineField(doc, ML + 22, y, "", model.verso.repetitividade.observacoes, CW - 24);
}

/**
 * Gera PDF RE-7.2A (2 páginas) com jsPDF — layout do formulário + logo/meta do tenant.
 */
export async function drawColetaPdf(row, tenantName = "", opts = {}) {
  const model = buildColetaPdfViewModel(row, tenantName, opts);
  const slug = coletaPdfFileSlug(row);
  const { logoDataUrl } = opts;

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  drawHeader(doc, model, logoDataUrl);
  drawFrente(doc, model);

  doc.addPage();
  drawHeader(doc, model, logoDataUrl);
  drawVerso(doc, model);

  drawInstitutionalPageFooters(doc);
  doc.save(`coleta-${slug}.pdf`);
}
