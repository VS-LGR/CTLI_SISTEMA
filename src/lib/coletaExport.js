import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, AlignmentType, HeadingLevel,
} from "docx";
import * as XLSX from "xlsx";
import {
  mergeColetaPayload,
  COLETA_DOC_CODE,
  COLETA_DOC_REF,
  COLETA_DOC_REV,
  triStateLabel,
  binaryLabel,
  tipoBalancaLabel,
  tipoPlataformaLabel,
} from "./coletaSchema";

function fmtDmy(isoDate) {
  if (!isoDate) return "";
  const [y, m, d] = String(isoDate).split("-");
  if (!y || !m || !d) return isoDate;
  return `${d}/${m}/${y}`;
}

export function buildColetaDocumentModel(row, tenantName = "") {
  const p = mergeColetaPayload(row?.payload);
  const prop = row?.commercial_proposal_ref || "";
  return {
    tenantName,
    commercialProposalRef: prop,
    payload: p,
    header: {
      title: "COLETA DE DADOS PARA CALIBRAÇÃO DE BALANÇA",
      code: `Cód. ${COLETA_DOC_CODE}  Ref. ${COLETA_DOC_REF}  ${COLETA_DOC_REV}`,
      proposal: prop ? `Referente à Proposta Comercial: ${prop}` : "Referente à Proposta Comercial:",
    },
  };
}

function fileSlug(row) {
  const serial = row?.scale_serial || "coleta";
  const date = row?.calibration_date || new Date().toISOString().slice(0, 10);
  return `${serial}-${date}`.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function drawHeader(doc, model, yStart = 12) {
  let y = yStart;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  if (model.header.proposal) {
    doc.text(model.header.proposal, 105, y, { align: "center" });
    y += 5;
  }
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(model.header.title, 105, y, { align: "center" });
  y += 5;
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(model.header.code, 105, y, { align: "center" });
  return y + 8;
}

export function exportColetaPdf(row, tenantName = "") {
  const model = buildColetaDocumentModel(row, tenantName);
  const p = model.payload;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const margin = 10;
  let y = drawHeader(doc, model);

  const section = (num, title) => {
    if (y > 265) {
      doc.addPage();
      y = drawHeader(doc, model, 12);
    }
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(`${num}) ${title}`, margin, y);
    y += 5;
    doc.setFont("helvetica", "normal");
  };

  const line = (label, value, x = margin, w = 90) => {
    if (y > 275) { doc.addPage(); y = 14; }
    doc.setFontSize(7.5);
    doc.text(`${label}: ${value || ""}`, x, y, { maxWidth: w });
    y += 4;
  };

  section("1", "Dados do Cliente");
  line("Cliente", p.cliente.cliente);
  line("Responsável", p.cliente.responsavel);

  section("2", "Informações da Balança");
  line("Fabricante", p.balanca.fabricante, margin, 45);
  line("Modelo", p.balanca.modelo, margin + 48, 45);
  line("Nº de série", p.balanca.serie, margin + 96, 45);
  line("Tag / Código Interno", p.balanca.tag, margin + 144, 45);
  y += 1;
  line("Local da Calibração", p.balanca.local);
  line("Etiqueta IPEM", p.balanca.etiqueta_ipem, margin, 45);
  line("Portaria Inmetro", p.balanca.portaria_inmetro, margin + 48, 45);
  line("Capacidade", p.balanca.capacidade, margin + 96, 45);
  line("Resolução", p.balanca.resolucao, margin + 144, 45);
  line("Unidade", p.balanca.unidade);
  line("Tipo de balança", tipoBalancaLabel(p.balanca.tipo_balanca, p.balanca.tipo_balanca_outros));
  line("Tipo de plataforma", tipoPlataformaLabel(p.balanca.tipo_plataforma));

  section("3", "Condições Ambientais Durante a Calibração");
  line("Climatização dos pesos-padrão e termo-baro-higrômetro", p.ambiente.climatizacao);
  line("Horário inicial", p.ambiente.horario_inicial, margin, 45);
  line("Horário final", p.ambiente.horario_final, margin + 48, 45);
  line("Temperatura inicial", `${p.ambiente.temp_inicial} °C`, margin + 96, 45);
  line("Temperatura final", `${p.ambiente.temp_final} °C`, margin + 144, 45);
  line("Umidade inicial", `${p.ambiente.umidade_inicial} %ur`, margin, 45);
  line("Umidade final", `${p.ambiente.umidade_final} %ur`, margin + 48, 45);
  line("Pressão inicial", `${p.ambiente.pressao_inicial} hPa`, margin + 96, 45);
  line("Pressão final", `${p.ambiente.pressao_final} hPa`, margin + 144, 45);
  line("A balança foi ajustada?", triStateLabel(p.ambiente.balanca_ajustada));
  line("A balança foi nivelada?", triStateLabel(p.ambiente.balanca_nivelada));
  line("Existe vibração no local?", binaryLabel(p.ambiente.existe_vibracao));
  line("Existe corrente de ar no local?", binaryLabel(p.ambiente.existe_corrente_ar));

  if (y > 200) { doc.addPage(); y = 14; }

  section("4", "Ensaio de Excentricidade");
  line("Valor Aplicado", p.excentricidade.valor_aplicado);
  autoTable(doc, {
    startY: y,
    head: [["Ponto", "Antes do ajuste", "Depois do ajuste"]],
    body: p.excentricidade.pontos.map((pt, i) => [
      String(i + 1),
      pt.antes || "",
      pt.depois || "",
    ]),
    styles: { fontSize: 7 },
    margin: { left: margin },
    tableWidth: 190,
  });
  y = doc.lastAutoTable.finalY + 6;

  section("5", "Controle");
  line("Representante do Cliente", p.controle.representante_cliente, margin, 90);
  line("Conferido e Transcrito por", p.controle.conferido_por, margin + 95, 90);
  line("Número do Certificado Emitido", p.controle.numero_certificado, margin, 90);
  line("Nome do Executor", p.controle.nome_executor, margin + 95, 90);
  line("Data da Calibração", fmtDmy(p.controle.data_calibracao));
  const pts = p.controle.pontos_solicitados === "sim" ? "SIM" : p.controle.pontos_solicitados === "nao" ? "NÃO" : "";
  line("Pontos de Calibração Solicitados pelo Cliente", pts);

  if (y > 220) { doc.addPage(); y = 14; }

  section("6", "Calibração da Balança");
  autoTable(doc, {
    startY: y,
    head: [[
      "Ponto",
      "Valor nominal do Peso de Referência",
      "Leitura antes do ajuste",
      "Leitura 1",
      "Leitura 2",
      "Leitura 3",
      "Identificação do(s) Peso(s) Padrão",
    ]],
    body: p.calibracao.pontos.map((pt, i) => [
      `P${i + 1}`,
      pt.peso_nominal || "",
      pt.leitura_antes || "",
      pt.rep1 || "",
      pt.rep2 || "",
      pt.rep3 || "",
      pt.identificacao_pesos || "",
    ]),
    styles: { fontSize: 6.5 },
    headStyles: { fillColor: [240, 240, 240], textColor: 20 },
    margin: { left: margin },
    tableWidth: 190,
  });

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i += 1) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.text(`Página ${i} de ${pageCount}`, 105, 290, { align: "center" });
  }

  doc.save(`coleta-${fileSlug(row)}.pdf`);
}

function cell(text, width = 2500) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    children: [new Paragraph({ children: [new TextRun({ text: String(text ?? ""), size: 18 })] })],
  });
}

export async function exportColetaDocx(row, tenantName = "") {
  const model = buildColetaDocumentModel(row, tenantName);
  const p = model.payload;
  const children = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: model.header.proposal, size: 20 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun({ text: model.header.title, bold: true })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: model.header.code, size: 18 })],
    }),
    new Paragraph({ children: [new TextRun({ text: `Ambiente: ${tenantName}`, italics: true })] }),
    new Paragraph({ children: [new TextRun({ text: "1) Dados do Cliente", bold: true })] }),
    new Paragraph({ children: [new TextRun(`Cliente: ${p.cliente.cliente}`)] }),
    new Paragraph({ children: [new TextRun(`Responsável: ${p.cliente.responsavel}`)] }),
    new Paragraph({ children: [new TextRun({ text: "2) Informações da Balança", bold: true })] }),
    new Paragraph({
      children: [new TextRun(
        `Fabricante: ${p.balanca.fabricante} | Modelo: ${p.balanca.modelo} | Série: ${p.balanca.serie} | Tag: ${p.balanca.tag}`,
      )],
    }),
    new Paragraph({ children: [new TextRun(`Tipo balança: ${tipoBalancaLabel(p.balanca.tipo_balanca, p.balanca.tipo_balanca_outros)}`)] }),
    new Paragraph({ children: [new TextRun({ text: "3) Condições Ambientais", bold: true })] }),
    new Paragraph({
      children: [new TextRun(
        `Temp: ${p.ambiente.temp_inicial}–${p.ambiente.temp_final} °C | Umidade: ${p.ambiente.umidade_inicial}–${p.ambiente.umidade_final} %ur`,
      )],
    }),
    new Paragraph({ children: [new TextRun({ text: "4) Ensaio de Excentricidade", bold: true })] }),
    new Table({
      rows: [
        new TableRow({ children: [cell("Ponto"), cell("Antes"), cell("Depois")] }),
        ...p.excentricidade.pontos.map((pt, i) => new TableRow({
          children: [cell(i + 1), cell(pt.antes), cell(pt.depois)],
        })),
      ],
    }),
    new Paragraph({ children: [new TextRun({ text: "5) Controle", bold: true })] }),
    new Paragraph({ children: [new TextRun(`Certificado: ${p.controle.numero_certificado} | Data: ${fmtDmy(p.controle.data_calibracao)}`)] }),
    new Paragraph({ children: [new TextRun({ text: "6) Calibração da Balança", bold: true })] }),
    new Table({
      rows: [
        new TableRow({
          children: [
            cell("Ponto"), cell("Peso ref."), cell("Antes"), cell("L1"), cell("L2"), cell("L3"), cell("Pesos padrão"),
          ],
        }),
        ...p.calibracao.pontos.map((pt, i) => new TableRow({
          children: [
            cell(`P${i + 1}`),
            cell(pt.peso_nominal),
            cell(pt.leitura_antes),
            cell(pt.rep1),
            cell(pt.rep2),
            cell(pt.rep3),
            cell(pt.identificacao_pesos),
          ],
        })),
      ],
    }),
  ];

  const docFile = new Document({ sections: [{ children }] });
  const blob = await Packer.toBlob(docFile);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `coleta-${fileSlug(row)}.docx`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportColetaXlsx(row, tenantName = "") {
  const model = buildColetaDocumentModel(row, tenantName);
  const p = model.payload;
  const rows = [
    ["COLETA DE DADOS PARA CALIBRAÇÃO DE BALANÇA"],
    [model.header.code],
    [model.header.proposal],
    [`Ambiente: ${tenantName}`],
    [],
    ["1) Dados do Cliente"],
    ["Cliente", p.cliente.cliente],
    ["Responsável", p.cliente.responsavel],
    [],
    ["2) Informações da Balança"],
    ["Fabricante", p.balanca.fabricante],
    ["Modelo", p.balanca.modelo],
    ["Nº de série", p.balanca.serie],
    ["Tag", p.balanca.tag],
    ["Local", p.balanca.local],
    ["Tipo balança", tipoBalancaLabel(p.balanca.tipo_balanca, p.balanca.tipo_balanca_outros)],
    [],
    ["3) Condições Ambientais"],
    ["Horário inicial", p.ambiente.horario_inicial],
    ["Horário final", p.ambiente.horario_final],
    ["Temperatura inicial °C", p.ambiente.temp_inicial],
    ["Temperatura final °C", p.ambiente.temp_final],
    [],
    ["4) Excentricidade — Valor aplicado", p.excentricidade.valor_aplicado],
    ["Ponto", "Antes do ajuste", "Depois do ajuste"],
    ...p.excentricidade.pontos.map((pt, i) => [i + 1, pt.antes, pt.depois]),
    [],
    ["5) Controle"],
    ["Representante", p.controle.representante_cliente],
    ["Certificado", p.controle.numero_certificado],
    ["Data calibração", fmtDmy(p.controle.data_calibracao)],
    [],
    ["6) Calibração"],
    ["Ponto", "Peso nominal", "Leitura antes", "Rep 1", "Rep 2", "Rep 3", "Identificação pesos"],
    ...p.calibracao.pontos.map((pt, i) => [
      `P${i + 1}`,
      pt.peso_nominal,
      pt.leitura_antes,
      pt.rep1,
      pt.rep2,
      pt.rep3,
      pt.identificacao_pesos,
    ]),
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Coleta");
  XLSX.writeFile(wb, `coleta-${fileSlug(row)}.xlsx`);
}
