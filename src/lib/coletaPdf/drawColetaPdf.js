import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  TIPO_BALANCA_OPTIONS,
  TIPO_PLATAFORMA_OPTIONS,
  unidadeLabel,
} from "../coletaSchema";
import { buildColetaPdfViewModel, coletaPdfFileSlug } from "./viewModel";

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

function drawHeader(doc, model, logoDataUrl, titleY = 12) {
  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, "PNG", ML, 6, 34, 14);
    } catch {
      /* logo opcional */
    }
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("COLETA DE DADOS PARA CALIBRAÇÃO DE BALANÇA", PAGE_W / 2, titleY, {
    align: "center",
  });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  const prop = model.header.proposalLine;
  doc.text(prop, MR, 8, { align: "right", maxWidth: 55 });
  doc.setFontSize(8);
  doc.text(model.header.codeLine, PAGE_W / 2, titleY + 6, { align: "center" });
}

function sectionTitle(doc, y, text) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(text, ML, y);
  doc.setFont("helvetica", "normal");
  return y + 5.5;
}

function underlineField(doc, x, y, label, value, width) {
  doc.setFontSize(8);
  const lbl = `${label} `;
  doc.text(lbl, x, y);
  const x0 = x + doc.getTextWidth(lbl);
  const x1 = x + width;
  doc.line(x0, y + 0.8, x1, y + 0.8);
  const val = s(value);
  if (val) doc.text(val, x0 + 0.5, y);
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
  doc.text(`${label} `, x, y);
  let cx = x + doc.getTextWidth(`${label} `);
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
  doc.text(`${label} `, x, y);
  let cx = x + doc.getTextWidth(`${label} `);
  ["sim", "nao"].forEach((v) => {
    const t = `(${mark(value === v)}) ${v === "sim" ? "sim" : "não"}  `;
    doc.text(t, cx, y);
    cx += doc.getTextWidth(t);
  });
  return y + 4.2;
}

function drawFrente(doc, model) {
  let y = 24;
  y = sectionTitle(doc, y, "1) Dados do Cliente");
  underlineField(doc, ML, y, "Cliente", model.cliente.cliente, CW);
  y += 5;
  underlineField(doc, ML, y, "Resposável", model.cliente.responsavel, CW);
  y += 7;

  y = sectionTitle(doc, y, "2) Informações da Balança");
  const col1 = ML;
  const col2 = ML + 48;
  const col3 = ML + 96;
  const fw = 44;
  doc.setFontSize(8);
  underlineField(doc, col1, y, "Fabricante:", model.balanca.fabricante, fw);
  underlineField(doc, col2, y, "Modelo:", model.balanca.modelo, fw);
  underlineField(doc, col3, y, "Nº de série:", model.balanca.serie, fw - 4);
  y += 5;
  underlineField(doc, col1, y, "Etiqueta IPEM:", model.balanca.etiqueta_ipem, fw);
  underlineField(doc, col2, y, "Portaria Inmetro:", model.balanca.portaria_inmetro, fw);
  underlineField(doc, col3, y, "Capacidade:", model.balanca.capacidade, fw - 4);
  y += 5;
  underlineField(doc, col1, y, "Local da Calibração:", model.balanca.local, fw + 20);
  underlineField(doc, col2, y, "Tag / Codigo Interno:", model.balanca.tag, fw);
  underlineField(doc, col3, y, "Resolução:", model.balanca.resolucao, fw - 4);
  y += 5;
  underlineField(doc, col3, y, "Unidade", unidadeLabel(model.balanca.unidade), 20);
  y += 6;

  const bal = model.balanca;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
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

  y = sectionTitle(doc, y, "3) Condições Ambientais Durante a Calibração");
  const amb = model.ambiente;
  const colR = ML + 98;
  doc.setFontSize(7.5);
  doc.text("Climatização dos pesos-padrão e termo-baro-higrômetro (1)", ML + 14, y);
  underlineField(doc, ML + 118, y - 0.5, "", amb.thermoLabel, 70);
  y += 4;
  doc.text("Termo-baro-higrômetro (2)", ML + 14, y);
  underlineField(doc, ML + 118, y - 0.5, "", amb.thermoLabel2, 70);
  y += 4;
  doc.text(`Horário inicial: ${s(amb.horario_inicial)}    Horário final: ${s(amb.horario_final)}`, ML, y);
  y += 4;
  y = triState(doc, ML, y, "A balança foi ajustada ?", amb.balanca_ajustada);
  y = triState(doc, ML, y, "A balança foi nivelada?", amb.balanca_nivelada);
  y = binaryRow(doc, ML, y, "Existe vibração no local?", amb.existe_vibracao);
  y = binaryRow(doc, ML, y, "Existe corrente de ar no local?", amb.existe_corrente_ar);

  let yR = y - 19;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("Temperatura (t) corrigida", colR, yR);
  doc.setFont("helvetica", "normal");
  yR += 3.5;
  doc.text(`Inicial: ${s(amb.temp_inicial)} °C    Final: ${s(amb.temp_final)} °C`, colR, yR);
  yR += 5;
  doc.setFont("helvetica", "bold");
  doc.text("Umidade relativa (h) corrigida", colR, yR);
  doc.setFont("helvetica", "normal");
  yR += 3.5;
  doc.text(`Inicial: ${s(amb.umidade_inicial)} %ur    Final: ${s(amb.umidade_final)} %ur`, colR, yR);
  yR += 5;
  doc.setFont("helvetica", "bold");
  doc.text("Pressão atmosférica (P) corrigida", colR, yR);
  doc.setFont("helvetica", "normal");
  yR += 3.5;
  doc.text(`Inicial: ${s(amb.pressao_inicial)} hPa    Final: ${s(amb.pressao_final)} hPa`, colR, yR);
  y = Math.max(y, yR) + 4;

  const ySec45 = y;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("4) Ensaio de Excentricidade", ML, ySec45);
  doc.text("5) Controle", ML + 98, ySec45);
  doc.setFont("helvetica", "normal");
  y += 5;

  const ecc = model.excentricidade;
  doc.setFontSize(8);
  doc.text(`Valor Aplicado: ${s(ecc.valor_aplicado)}`, ML, y);
  const ctrl = model.controle;
  underlineField(doc, ML + 98, y, "Representante do Cliente", ctrl.representante_cliente, 92);
  y += 5;

  autoTable(doc, {
    startY: y,
    margin: { left: ML, right: PAGE_W - ML - 98 },
    tableWidth: 88,
    head: [["Ponto", "Antes do ajuste", "Depois do ajuste"]],
    body: ecc.pontos.map((pt, i) => [String(i + 1), s(pt.antes), s(pt.depois)]),
    styles: { fontSize: 7, cellPadding: 1.2, lineWidth: 0.1 },
    headStyles: { fillColor: [255, 255, 255], textColor: 0, fontStyle: "bold" },
    theme: "grid",
  });

  let yCtrl = y;
  const ctrlFields = [
    ["Conferido e Transcrito por", ctrl.conferido_por],
    ["Número do Certificado Emitido", ctrl.numero_certificado],
    ["Nome do Executor", ctrl.nome_executor],
    ["Data da Calibração", ctrl.data_calibracao_fmt],
  ];
  ctrlFields.forEach(([lbl, val]) => {
    yCtrl += 5;
    underlineField(doc, ML + 98, yCtrl, lbl, val, 92);
  });
  yCtrl += 5;
  doc.setFontSize(7.5);
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

  y = sectionTitle(doc, y, "6) Calibração da Balança");
  doc.setFontSize(8);
  doc.text("Ensaio de Repetitividade", ML + 72, y - 1);
  y += 4;

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
    headStyles: { fillColor: [255, 255, 255], textColor: 0, fontStyle: "bold", fontSize: 6 },
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

  doc.setFontSize(7);
  doc.text("Página 1 de 2", MR, 290, { align: "right" });
}

function drawVersoFooter(doc, model) {
  const { footer } = model;
  doc.setFontSize(7);
  doc.text(`Cód. ${footer.code}`, ML, 290);
  doc.text(`Ref. ${footer.ref}`, PAGE_W / 2, 290, { align: "center" });
  doc.text(footer.revision, MR, 290, { align: "right" });
  doc.text("Página 2 de 2", MR, 286, { align: "right" });
}

function drawVerso(doc, model) {
  if (!model.verso.repetitividadeAplicavel) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(
      "Ensaio de repetitividade com carga de substituição não aplicável.",
      PAGE_W / 2,
      120,
      { align: "center" },
    );
    drawVersoFooter(doc, model);
    return;
  }

  let y = 24;
  y = sectionTitle(doc, y, "1) Descrição da Carga");
  const boxH = 27;
  doc.rect(ML, y, CW, boxH);
  doc.setFontSize(8);
  const desc = s(model.verso.descricao_carga);
  const lines = doc.splitTextToSize(desc || " ", CW - 4);
  doc.text(lines, ML + 2, y + 4);
  y += boxH + 8;

  y = sectionTitle(doc, y, "2) Questões sobre a Carga");
  const q = model.verso.questoes;
  doc.setFontSize(8);
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

  y = sectionTitle(doc, y, "3) Repetitividade com Carga de Substituição");
  y += 3;

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
    headStyles: { fillColor: [255, 255, 255], textColor: 0, fontStyle: "bold", fontSize: 6 },
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

  drawVersoFooter(doc, model);
}

/**
 * Gera PDF RE-7.2A (2 páginas) com jsPDF — sem html2canvas.
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

  doc.save(`coleta-${slug}.pdf`);
}
