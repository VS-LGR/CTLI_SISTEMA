import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { buildCertificatePdfViewModel } from "./viewModel";
import { drawInstitutionalPageFooters } from "@/lib/institutionalPdf/drawPageFooters";

const ML = 10;
const MR = 200;
const PAGE_W = 210;

function s(v) {
  return v == null ? "" : String(v);
}

function drawWatermark(doc, text) {
  const pages = doc.internal.getNumberOfPages();
  for (let p = 1; p <= pages; p += 1) {
    doc.setPage(p);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(28);
    doc.setTextColor(220, 38, 38);
    doc.text(text, PAGE_W / 2, 148, { align: "center", angle: 35 });
    doc.setTextColor(0, 0, 0);
  }
}

function drawHeader(doc, model, logoDataUrl) {
  const headerTop = 6;
  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, "PNG", ML, headerTop, 32, 13);
    } catch { /* optional */ }
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(model.header.title, PAGE_W / 2, headerTop + 9, { align: "center", maxWidth: 160 });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text(model.header.codeLine, PAGE_W / 2, headerTop + 14, { align: "center" });
  doc.setFontSize(9);
  doc.text(`Nº ${model.certificateNumber}  Rev. ${model.revision}`, PAGE_W / 2, headerTop + 19, { align: "center" });
  return headerTop + 24;
}

export function drawCertificatePdf(doc, model, { logoDataUrl } = {}) {
  let y = drawHeader(doc, model, logoDataUrl);

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("CLIENTE", ML, y);
  y += 4;
  doc.setFont("helvetica", "normal");
  doc.text(`Razão Social: ${s(model.client.name)}`, ML, y);
  y += 4;
  doc.text(`CNPJ: ${s(model.client.cnpj)}  Responsável: ${s(model.client.responsible)}`, ML, y);
  y += 4;
  doc.text(`Local: ${s(model.client.address)}`, ML, y);
  y += 6;

  doc.setFont("helvetica", "bold");
  doc.text("INSTRUMENTO CALIBRADO", ML, y);
  y += 4;
  doc.setFont("helvetica", "normal");
  const balLines = [
    `Fabricante: ${s(model.balance.fabricante)}  Modelo: ${s(model.balance.modelo)}`,
    `Nº Série: ${s(model.balance.serie)}  Tag: ${s(model.balance.tag)}`,
    `Capacidade: ${s(model.balance.capacidade)} ${s(model.balance.unidade)}  Resolução: ${s(model.balance.resolucao)}`,
    `Tipo: ${s(model.balance.tipo)}  Plataforma: ${s(model.balance.plataforma)}`,
    `Data da calibração: ${s(model.calibrationDate)}  Proposta: ${s(model.proposalRef)}`,
  ];
  balLines.forEach((ln) => { doc.text(ln, ML, y); y += 4; });
  y += 2;

  const env = model.environmental || {};
  doc.setFont("helvetica", "bold");
  doc.text("CONDIÇÕES AMBIENTAIS", ML, y);
  y += 4;
  doc.setFont("helvetica", "normal");
  doc.text(
    `Temp: ${s(env.initial_temperature)} a ${s(env.final_temperature)} °C  Umidade: ${s(env.initial_humidity)} a ${s(env.final_humidity)} %  Pressão: ${s(env.initial_pressure)} a ${s(env.final_pressure)} hPa`,
    ML, y, { maxWidth: MR - ML },
  );
  y += 6;

  if (model.standards?.length) {
    autoTable(doc, {
      startY: y,
      margin: { left: ML, right: PAGE_W - MR },
      head: [["Padrão", "Identificação", "Certificado", "Validade", "Laboratório"]],
      body: model.standards.map((st) => [
        st.type === "termo_baro_higrometro" ? "TBH" : "Peso",
        s(st.code),
        s(st.certificate),
        s(st.validUntil),
        s(st.laboratory),
      ]),
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: { fillColor: [30, 58, 138], textColor: 255 },
    });
    y = doc.lastAutoTable.finalY + 4;
  }

  if (model.points?.length) {
    autoTable(doc, {
      startY: y,
      margin: { left: ML, right: PAGE_W - MR },
      head: [["Ponto", "Nominal", "Média", "Erro", "Repetitividade", "Incerteza Exp.", "k"]],
      body: model.points.map((p) => [
        p.label, p.nominal, p.average, p.error, p.repeatability, p.expandedUncertainty, p.k,
      ]),
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: { fillColor: [30, 58, 138], textColor: 255 },
    });
    y = doc.lastAutoTable.finalY + 4;
  }

  if (model.conformity?.legal_metrology_applicable) {
    doc.setFont("helvetica", "bold");
    doc.text("CONFORMIDADE / METROLOGIA LEGAL", ML, y);
    y += 4;
    doc.setFont("helvetica", "normal");
    doc.text(
      `Classe: ${s(model.conformity.instrument_class)}  Portaria: ${s(model.conformity.applicable_ordinance)}  Resultado: ${s(model.conformity.general_conformity_result)}`,
      ML, y, { maxWidth: MR - ML },
    );
    y += 6;
  }

  doc.setFontSize(7);
  doc.text(model.legalText, ML, y, { maxWidth: MR - ML });
  y += 8;

  doc.text(`Executor: ${s(model.executorName)}`, ML, y);
  doc.text(`Signatário: ${s(model.signatoryName)}`, MR - 60, y);
  y += 4;
  if (model.issueDate) doc.text(`Data de emissão: ${s(model.issueDate)}`, ML, y);

  if (model.preview) drawWatermark(doc, "PRÉVIA TÉCNICA");
  if (model.cancelled) drawWatermark(doc, "CANCELADO");

  drawInstitutionalPageFooters(doc, { rightX: PAGE_W - 10 });
}

export async function renderCertificatePdf(cert, tenantName, opts = {}) {
  const model = buildCertificatePdfViewModel(cert, opts);
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  drawCertificatePdf(doc, model, opts);
  const name = opts.fileName || `certificado-${cert.certificate_number || cert.id?.slice(0, 8)}.pdf`;
  doc.save(name);
}
