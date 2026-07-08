import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { prepareMasterDocumentExport, recordMasterDocumentExport } from "@/lib/masterDocuments/masterDocumentExportHelper";
import { drawInstitutionalPdfHeader } from "@/lib/institutionalPdf/drawHeader";
import { drawInstitutionalPageFooters } from "@/lib/institutionalPdf/drawPageFooters";
import { ML, TEXT } from "@/lib/institutionalPdf/theme";
import { fmtDmyShort } from "@/lib/dateFormat";
import { loadTenantLogoDataUrl } from "@/lib/tenantBranding";
import {
  MONTH_KEYS,
  MONTH_LABELS,
  equipmentKindLabel,
  formatAssetLabel,
  formatVerificationValue,
  getVerificationChecklist,
  isLegacyResponses,
  LEGACY_ASSET_KEY,
  normalizeMultiAssetResponses,
  normalizeMultiAssetResponsible,
} from "./verificationChecklist";

const TABLE_STYLES = {
  font: "helvetica",
  fontSize: 7,
  textColor: TEXT,
};

function drawAssetChecklistTable(doc, {
  kind,
  assetLabel,
  responses,
  responsible,
  startY,
}) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...TEXT);
  doc.text(assetLabel, ML, startY);
  startY += 4;

  const checklist = getVerificationChecklist(kind);
  const headMonths = MONTH_LABELS.map((m) => m.slice(0, 3));
  const body = checklist.map((item) => [
    item.label,
    ...MONTH_KEYS.map((m) => formatVerificationValue(kind, responses[item.key]?.[m])),
  ]);
  const respRow = [
    "Responsável",
    ...MONTH_KEYS.map((m) => responsible[m] || ""),
  ];

  autoTable(doc, {
    startY,
    margin: { left: ML, right: 10 },
    head: [["Itens a serem verificados", ...headMonths]],
    body: [...body, respRow],
    styles: TABLE_STYLES,
    headStyles: { fillColor: [37, 99, 235], textColor: TEXT, fontStyle: "bold", fontSize: 6.5 },
    columnStyles: { 0: { cellWidth: 55 } },
  });

  return (doc.lastAutoTable?.finalY || startY) + 8;
}

export async function downloadEquipmentVerificationPdf(record, {
  tenantId = null,
  tenantName = "",
  tenant = null,
  logoDataUrl: preloadedLogo = null,
} = {}) {
  const kind = record.equipment_kind;
  const year = record.year;
  const kindLabel = equipmentKindLabel(kind);
  const assets = record.assets || [];
  const linkedIds = assets.map((a) => a.id).length
    ? assets.map((a) => a.id)
    : (record.linked_asset_ids || []);

  const responsesByAsset = normalizeMultiAssetResponses(kind, record.responses, linkedIds);
  const responsibleByAsset = normalizeMultiAssetResponsible(
    record.responsible_by_month || {},
    linkedIds,
  );

  const { meta, fileName } = await prepareMasterDocumentExport({
    tenantId,
    code: "RE-6.4.12B",
    defaultTitle: "Verificação de Equipamento",
    fileNameContext: {
      equipamento: kindLabel,
      ano: year,
    },
  });

  const logoDataUrl = preloadedLogo
    || (tenant ? await loadTenantLogoDataUrl(tenant) : null);

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const header = {
    title: meta?.title || "Verificação de Equipamento",
    code: meta?.code || "RE-6.4.12B",
    reference: meta?.reference || "PR-6.4.12",
    revision: meta?.revision || "00",
    modelIssueDate: meta?.modelIssueDate || null,
  };
  let startY = drawInstitutionalPdfHeader(doc, header, logoDataUrl);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...TEXT);
  doc.text(
    `Equipamento: ${kindLabel}  |  Ano: ${year}  |  Ambiente: ${tenantName || "—"}`,
    ML,
    startY + 2,
  );
  startY += 8;

  if (assets.length) {
    for (const asset of assets) {
      const assetLabel = formatAssetLabel(asset, kind);
      const pageH = doc.internal.pageSize.getHeight();
      if (startY > pageH - 60) {
        doc.addPage();
        startY = drawInstitutionalPdfHeader(doc, header, logoDataUrl) + 8;
      }
      startY = drawAssetChecklistTable(doc, {
        kind,
        assetLabel,
        responses: responsesByAsset[asset.id] || {},
        responsible: responsibleByAsset[asset.id] || {},
        startY,
      });
    }
  } else if (isLegacyResponses(record.responses, kind)) {
    startY = drawAssetChecklistTable(doc, {
      kind,
      assetLabel: kindLabel,
      responses: responsesByAsset[LEGACY_ASSET_KEY] || record.responses,
      responsible: responsibleByAsset[LEGACY_ASSET_KEY] || record.responsible_by_month || {},
      startY,
    });
  }

  let y = (doc.lastAutoTable?.finalY || startY) + 6;
  const pageH = doc.internal.pageSize.getHeight();
  if (y > pageH - 30) {
    doc.addPage();
    y = drawInstitutionalPdfHeader(doc, header, logoDataUrl) + 12;
  }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...TEXT);
  doc.text(`Ocorrências: ${record.occurrences || "—"}`, ML, y);
  y += 6;
  doc.text(`Emitido e Aprovado por: ${record.issued_approved_by || "—"}`, ML, y);
  y += 6;
  doc.text(`Data de emissão do registro: ${fmtDmyShort(record.issue_date) || "—"}`, ML, y);

  drawInstitutionalPageFooters(doc);
  doc.save(fileName);

  if (tenantId && meta?.id) {
    await recordMasterDocumentExport({
      tenantId,
      meta,
      fileName,
      sourceModule: "re6412b_verificacao",
      sourceRecordId: record.id,
    });
  }

  return { fileName };
}
