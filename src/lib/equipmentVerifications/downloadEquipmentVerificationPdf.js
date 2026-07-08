import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { prepareMasterDocumentExport, recordMasterDocumentExport } from "@/lib/masterDocuments/masterDocumentExportHelper";
import { drawInstitutionalReportHeader } from "@/lib/institutionalPdf/drawHeader";
import { drawInstitutionalPageFooters } from "@/lib/institutionalPdf/drawPageFooters";
import { ML, TEXT } from "@/lib/institutionalPdf/theme";
import { fmtDmyShort } from "@/lib/dateFormat";
import {
  MONTH_KEYS,
  MONTH_LABELS,
  equipmentKindLabel,
  formatVerificationValue,
  getVerificationChecklist,
  normalizeVerificationResponses,
} from "./verificationChecklist";

const TABLE_STYLES = {
  font: "helvetica",
  fontSize: 7,
  textColor: TEXT,
};

export async function downloadEquipmentVerificationPdf(record, {
  tenantId = null,
  tenantName = "",
} = {}) {
  const kind = record.equipment_kind;
  const year = record.year;
  const kindLabel = equipmentKindLabel(kind);
  const responses = normalizeVerificationResponses(kind, record.responses);
  const checklist = getVerificationChecklist(kind);
  const responsible = record.responsible_by_month || {};

  const { meta, fileName } = await prepareMasterDocumentExport({
    tenantId,
    code: "RE-6.4.12B",
    defaultTitle: "Verificação de Equipamento",
    fileNameContext: {
      equipamento: kindLabel,
      ano: year,
    },
  });

  const doc = new jsPDF({ orientation: "landscape" });
  const startY = drawInstitutionalReportHeader(doc, {
    title: `Verificação de Equipamento — ${kindLabel}`,
    subtitle: `RE-6.4.12B  |  REF.: PR-6.4.12  |  Ano: ${year}  |  Ambiente: ${tenantName || "—"}`,
  });

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
    startY: startY + 4,
    margin: { left: ML },
    head: [["Itens a serem verificados", ...headMonths]],
    body: [...body, respRow],
    styles: TABLE_STYLES,
    headStyles: { fillColor: [37, 99, 235], textColor: TEXT, fontStyle: "bold", fontSize: 6.5 },
    columnStyles: { 0: { cellWidth: 55 } },
  });

  let y = (doc.lastAutoTable?.finalY || startY) + 10;
  doc.setFontSize(9);
  doc.setTextColor(...TEXT);
  doc.text(`Ocorrências: ${record.occurrences || "—"}`, ML, y);
  y += 6;
  doc.text(`Emitido e Aprovado por: ${record.issued_approved_by || "—"}`, ML, y);
  y += 6;
  doc.text(`Emissão: ${fmtDmyShort(record.issue_date) || "—"}`, ML, y);

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
