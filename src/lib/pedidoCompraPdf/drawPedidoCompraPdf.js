import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { buildPedidoCompraPdfViewModel } from "./viewModel";

const ML = 10;
const MR = 200;
const PAGE_W = 210;
const HEADER_GRAY = [217, 217, 217];
const BORDER = [180, 180, 180];
const TEXT = [30, 30, 30];

const LOGO_W = 32;
const LOGO_H = 13;

function serviceColumns(type) {
  const commonEnd = [
    { header: "Qtd", dataKey: "quantity" },
    { header: "V. Unit.", dataKey: "unitValue" },
    { header: "Total", dataKey: "totalValue" },
  ];
  switch (type) {
    case "calibracao_pesos_padrao":
      return [
        { header: "Item", dataKey: "itemNumber" },
        { header: "Equipamento", dataKey: "equipment" },
        { header: "Material", dataKey: "material" },
        { header: "Identificação", dataKey: "identificationCodes" },
        { header: "Valor nominal", dataKey: "nominalValues" },
        { header: "Erro e Incerteza Máx. Permitida", dataKey: "maxErrorUncertainty" },
        ...commonEnd,
      ];
    case "calibracao_termo_baro_higrometro":
      return [
        { header: "Item", dataKey: "itemNumber" },
        { header: "Equipamento", dataKey: "equipment" },
        { header: "Identificação", dataKey: "identificationCodes" },
        { header: "Grandeza", dataKey: "magnitude" },
        { header: "Valores nominais aprox.", dataKey: "nominalValues" },
        { header: "Erro e Incerteza Máx. Permitida", dataKey: "maxErrorUncertainty" },
        ...commonEnd,
      ];
    case "compra_pesos":
      return [
        { header: "Item", dataKey: "itemNumber" },
        { header: "Equipamento", dataKey: "equipment" },
        { header: "Material", dataKey: "material" },
        { header: "Identificação", dataKey: "identificationCodes" },
        { header: "Valores nominais aprox.", dataKey: "nominalValues" },
        { header: "Erro e Incerteza Máx. Permitida", dataKey: "hiringCriteria" },
        ...commonEnd,
      ];
    case "compra_termo_baro_higrometro":
      return [
        { header: "Item", dataKey: "itemNumber" },
        { header: "Grandeza", dataKey: "magnitude" },
        { header: "Valores nominais aprox.", dataKey: "minimumReadingRange" },
        { header: "Erro e Incerteza Máx. Permitida", dataKey: "acceptableResolution" },
        ...commonEnd,
      ];
    case "auditoria_interna":
      return [
        { header: "Item", dataKey: "itemNumber" },
        { header: "Escopo da auditoria", dataKey: "auditScope" },
        ...commonEnd,
      ];
    case "ensaio_proficiencia":
      return [
        { header: "Item", dataKey: "itemNumber" },
        { header: "Programa", dataKey: "programName" },
        { header: "Artefatos", dataKey: "artifactsDescription" },
        { header: "Critério", dataKey: "hiringCriteria" },
        ...commonEnd,
      ];
    default:
      return [
        { header: "Item", dataKey: "itemNumber" },
        { header: "Descrição", dataKey: "equipment" },
        ...commonEnd,
      ];
  }
}

function drawWatermark(doc, text) {
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(48);
    doc.setTextColor(220, 220, 220);
    doc.text(text, PAGE_W / 2, 148, { align: "center", angle: 35 });
    doc.setTextColor(...TEXT);
  }
}

function drawHeader(doc, model, logoDataUrl, yStart = 8) {
  const y = yStart;
  const rightX = MR - 2;
  const centerX = PAGE_W / 2;

  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, "PNG", ML, y, LOGO_W, LOGO_H);
    } catch { /* optional */ }
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...TEXT);
  doc.text(model.header.displayTitle || "Pedido de compras", centerX, y + 6, { align: "center", maxWidth: 90 });

  if (model.header.typeLabel) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(model.header.typeLabel, centerX, y + 11, { align: "center", maxWidth: 95 });
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(`Nº do Pedido: ${model.header.orderNumber}`, centerX, y + (model.header.typeLabel ? 16 : 14), { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  let ry = y + 4;
  const metaLines = [
    `Cód.: ${model.header.code}`,
    `Ref.: ${model.header.reference}`,
    `Rev.: ${model.header.revision}`,
    `Emissão: ${model.header.issueEmission}`,
  ];
  for (const line of metaLines) {
    doc.text(line, rightX, ry, { align: "right" });
    ry += 4.5;
  }

  return Math.max(y + LOGO_H + 2, ry + 2, y + 20);
}

function drawTwoColBlock(doc, y, leftTitle, leftLines, rightTitle, rightLines) {
  const colW = (MR - ML) / 2 - 2;
  const mid = ML + colW + 4;
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.1);
  doc.rect(ML, y, colW, 32);
  doc.rect(mid, y, colW, 32);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...TEXT);
  doc.text(leftTitle, ML + 2, y + 5);
  doc.text(rightTitle, mid + 2, y + 5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  let ly = y + 9;
  for (const line of leftLines) {
    doc.text(line, ML + 2, ly, { maxWidth: colW - 4 });
    ly += 3.5;
  }
  let ry = y + 9;
  for (const line of rightLines) {
    doc.text(line, mid + 2, ry, { maxWidth: colW - 4 });
    ry += 3.5;
  }
  return y + 36;
}

export function drawPedidoCompraPdf(order, { logoDataUrl, employees = [] } = {}) {
  const model = buildPedidoCompraPdfViewModel(order, { employees });
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = drawHeader(doc, model, logoDataUrl);

  y = drawTwoColBlock(
    doc,
    y,
    "Fornecedor",
    [
      `Empresa: ${model.supplier.company}`,
      `At.: ${model.supplier.contact}`,
      `Endereço: ${model.supplier.address}`,
      `Tel.: ${model.supplier.phone}`,
      `CNPJ: ${model.supplier.cnpj}`,
      `E-mail: ${model.supplier.email}`,
    ],
    "Dados para Faturamento",
    [
      `Razão Social: ${model.billing.legalName}`,
      `Nome fantasia: ${model.billing.tradeName}`,
      `Endereço: ${model.billing.address}`,
      `CEP: ${model.billing.cep}  ${model.billing.city}/${model.billing.state}`,
      `CNPJ: ${model.billing.cnpj}`,
      `IE: ${model.billing.stateRegistration}`,
      `E-mail: ${model.billing.email}`,
    ],
  );

  const cols = serviceColumns(model.type);
  const head = [cols.map((c) => c.header)];
  const body = model.items.map((row) => cols.map((c) => row[c.dataKey] ?? "-"));

  autoTable(doc, {
    startY: y,
    head,
    body: body.length ? body : [["-", "-", "-"]],
    margin: { left: ML, right: PAGE_W - MR },
    styles: { fontSize: 6.5, cellPadding: 1.2, textColor: TEXT },
    headStyles: { fillColor: HEADER_GRAY, textColor: TEXT, fontStyle: "bold" },
    theme: "grid",
    didDrawPage: (data) => {
      if (data.pageNumber > 1) {
        drawHeader(doc, model, logoDataUrl, 6);
      }
    },
  });

  y = doc.lastAutoTable.finalY + 4;
  doc.setFontSize(8);
  doc.text(`Subtotal: ${model.totals.subtotal}  |  Desconto: ${model.totals.discount}  |  Total: ${model.totals.finalValue}`, MR, y, { align: "right" });
  y += 6;

  doc.setFont("helvetica", "bold");
  doc.text("Dados complementares", ML, y);
  y += 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  const compLines = [
    `Pagamento: ${model.complements.paymentTerms}`,
    `Frete: ${model.complements.freight}  |  Transportadora: ${model.complements.carrier}`,
    `Cotação: ${model.complements.quotation}  |  Período: ${model.complements.executionPeriod}`,
    `Obs.: ${model.complements.observations}`,
  ];
  for (const line of compLines) {
    doc.text(line, ML, y, { maxWidth: MR - ML });
    y += 4;
  }

  y += 4;
  doc.setFont("helvetica", "bold");
  doc.text("Assinaturas", ML, y);
  y += 8;
  doc.setFont("helvetica", "normal");
  const sigW = (MR - ML) / 2 - 4;
  doc.line(ML, y + 12, ML + sigW, y + 12);
  doc.line(ML + sigW + 8, y + 12, MR, y + 12);
  const sig1Label = model.signatures.technicalManager.roleLabel || "Gerente Técnico";
  const sig2Label = model.signatures.purchase.roleLabel || "Compras";
  doc.setFontSize(7);
  doc.text(sig1Label, ML + sigW / 2, y + 14, { align: "center" });
  doc.text(sig2Label, ML + sigW + 8 + sigW / 2, y + 14, { align: "center" });
  doc.setFontSize(8);
  doc.text(model.signatures.technicalManager.full_name || "—", ML + sigW / 2, y + 18, { align: "center" });
  doc.text(model.signatures.purchase.full_name || "—", ML + sigW + 8 + sigW / 2, y + 18, { align: "center" });

  if (model.inspectionLines?.length) {
    y += 22;
    if (y > 250) {
      doc.addPage();
      y = drawHeader(doc, model, logoDataUrl, 6) + 4;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("Inspeção de recebimento", ML, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    for (const line of model.inspectionLines) {
      if (y > 275) {
        doc.addPage();
        y = drawHeader(doc, model, logoDataUrl, 6) + 4;
      }
      const wrapped = doc.splitTextToSize(`${line.label}: ${line.value}`, MR - ML);
      doc.text(wrapped, ML, y);
      y += wrapped.length * 3.5 + 1;
    }
  }

  if (model.isDraft) drawWatermark(doc, "RASCUNHO");

  return doc;
}
