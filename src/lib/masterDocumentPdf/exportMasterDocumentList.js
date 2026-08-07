import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { drawInstitutionalPdfHeader } from "@/lib/institutionalPdf/drawHeader";
import { drawInstitutionalPageFooters } from "@/lib/institutionalPdf/drawPageFooters";
import { ML, MR, PAGE_W, TEXT, FORM_COLORS } from "@/lib/institutionalPdf/theme";
import {
  listMasterDocuments,
  listExternalDocuments,
  listControlledSoftware,
  listDocumentRevisions,
  listDocumentDistributions,
  revisionResponsibleName,
} from "@/lib/masterDocuments/masterDocumentsApi";
import { findListaMestraDocument } from "@/lib/masterDocuments/findListaMestraDocument";
import { buildDistributionMap, getDistributionSummaryForDoc } from "@/lib/masterDocuments/masterDocumentDistribution";
import { formatDateBr } from "@/lib/quotationRequestDisplay";
import { generateDocumentFileName } from "@/lib/masterDocuments/masterDocumentFileName";
import { loadTenantResponsibles } from "@/lib/tenantResponsiblesApi";

async function loadLogoDataUrl(tenant) {
  if (!tenant?.logo_storage_path) return null;
  try {
    const { supabase } = await import("@/lib/supabaseClient");
    const { data } = await supabase.storage.from("tenant-branding").createSignedUrl(tenant.logo_storage_path, 3600);
    if (!data?.signedUrl) return null;
    const res = await fetch(data.signedUrl);
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function sectionTitle(doc, y, text) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...TEXT);
  doc.text(text, ML, y);
  return y + 8;
}

function noteText(doc, y, text) {
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(...TEXT);
  doc.text(text, ML, y, { maxWidth: PAGE_W - ML - (PAGE_W - MR) });
  return y + 6;
}

const TABLE_MARGIN = { left: ML, right: PAGE_W - MR };

const INTERNAL_COL_WIDTHS = {
  0: { cellWidth: 22 },
  1: { cellWidth: 10 },
  2: { cellWidth: 52 },
  3: { cellWidth: 18 },
  4: { cellWidth: 18 },
  5: { cellWidth: 22 },
  6: { cellWidth: 18 },
  7: { cellWidth: 18 },
};

const EXTERNAL_COL_WIDTHS = {
  0: { cellWidth: 38 },
  1: { cellWidth: 20 },
  2: { cellWidth: 14 },
  3: { cellWidth: 16 },
  4: { cellWidth: 16 },
  5: { cellWidth: 16 },
  6: { cellWidth: 12 },
  7: { cellWidth: 38 },
};

function drawDocTable(doc, startY, headers, rows, columnStyles = INTERNAL_COL_WIDTHS) {
  autoTable(doc, {
    startY,
    head: [headers],
    body: rows.length ? rows : [["—", "—", "—", "—", "—", "—", "—", "—"].slice(0, headers.length)],
    margin: TABLE_MARGIN,
    theme: "grid",
    styles: { fontSize: 7, cellPadding: 1.5, overflow: "linebreak", textColor: TEXT },
    headStyles: { fillColor: FORM_COLORS.tableHeader, textColor: TEXT, fontStyle: "bold" },
    columnStyles,
  });
  return doc.lastAutoTable.finalY + 6;
}

function responsibleNameById(responsibles, id) {
  if (!id) return "—";
  return responsibles.find((r) => r.id === id)?.name || "—";
}

export async function exportMasterDocumentListPdf(tenantId, tenant) {
  const [
    allDocs,
    externals,
    software,
    listaDocRow,
    allDistributions,
    responsibles,
  ] = await Promise.all([
    listMasterDocuments(tenantId, {}),
    listExternalDocuments(tenantId),
    listControlledSoftware(tenantId),
    findListaMestraDocument(tenantId),
    listDocumentDistributions(tenantId),
    loadTenantResponsibles(tenantId),
  ]);

  const listaRevisions = listaDocRow?.id
    ? await listDocumentRevisions(tenantId, listaDocRow.id)
    : [];
  const listaRevisionsSorted = [...listaRevisions].sort((a, b) =>
    String(a.revision_number).localeCompare(String(b.revision_number), undefined, { numeric: true }),
  );

  const distributionMap = buildDistributionMap(allDistributions);
  const listaDistributions = listaDocRow?.id
    ? (distributionMap[listaDocRow.id] || [])
    : [];

  const logoDataUrl = await loadLogoDataUrl(tenant);
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  const header = {
    title: "LISTA MESTRA DE DOCUMENTOS",
    code: listaDocRow?.code || "RE-8.3A",
    reference: listaDocRow?.reference || "PR-8.3",
    revision: listaDocRow?.current_revision || "03",
    modelIssueDate: listaDocRow?.current_issue_date || "2026-06-01",
  };

  let y = drawInstitutionalPdfHeader(doc, header, logoDataUrl);

  y = sectionTitle(doc, y, "Lista de Distribuição");
  y = drawDocTable(
    doc,
    y,
    ["Área", "Usuário", "Cópia n.º"],
    listaDistributions.map((d) => [
      d.area || "—",
      d.recipient_name || "—",
      d.copy_number ?? "—",
    ]),
    { 0: { cellWidth: 60 }, 1: { cellWidth: 60 }, 2: { cellWidth: 30 } },
  );

  y = sectionTitle(doc, y, "Histórico de Revisões");
  y = drawDocTable(
    doc,
    y,
    ["Rev.", "Data", "Descrição da modificação", "Resp."],
    listaRevisionsSorted.map((r) => [
      r.revision_number,
      formatDateBr(r.revision_date || r.issue_date),
      r.change_description || "—",
      revisionResponsibleName(r),
    ]),
    { 0: { cellWidth: 14 }, 1: { cellWidth: 22 }, 2: { cellWidth: 110 }, 3: { cellWidth: 34 } },
  );

  const emissor = responsibleNameById(responsibles, listaDocRow?.emission_responsible_id);
  const aprovador = responsibleNameById(responsibles, listaDocRow?.approval_responsible_id);
  const approvalDate = formatDateBr(listaDocRow?.current_issue_date || header.modelIssueDate);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`EMISSOR: ${emissor}`, ML, y);
  doc.text(`APROVAÇÃO: ${aprovador}`, ML + 70, y);
  doc.text(`DATA: ${approvalDate}`, ML + 140, y);
  y += 10;

  y = noteText(doc, y, "Análise Crítica Periódica dos Documentos SGQ realizada a cada 24 meses.");
  y += 2;

  const internals = allDocs.filter((d) => d.type !== "documento_externo" && d.status !== "cancelado");
  const manuals = internals.filter((d) => ["manual", "politica", "documento_interno"].includes(d.type));
  const procedures = internals.filter((d) => d.type === "procedimento");
  const records = internals.filter((d) => d.type === "registro" || d.type === "lista");
  const planilhaDocs = internals.filter((d) => d.type === "planilha_software");

  const headers = [
    "N.º", "Rev.", "Título", "Rev. anterior", "Rev. atual",
    "Distribuição", "Últ. análise", "Próx. análise",
  ];

  const rowMap = (d) => [
    d.code || "—",
    d.current_revision,
    d.title,
    formatDateBr(d.previous_revision_date),
    formatDateBr(d.current_revision_date),
    getDistributionSummaryForDoc(distributionMap, d.id),
    formatDateBr(d.last_critical_analysis_date),
    formatDateBr(d.next_critical_analysis_date),
  ];

  y = sectionTitle(doc, y, "Manual e Política");
  y = drawDocTable(doc, y, headers, manuals.map(rowMap));

  y = sectionTitle(doc, y, "Procedimentos");
  y = drawDocTable(doc, y, headers, procedures.map(rowMap));

  y = sectionTitle(doc, y, "Registros da Qualidade");
  y = drawDocTable(doc, y, headers, records.map(rowMap));

  const softwareRows = [
    ...software.map((s) => [
      s.title,
      s.revision,
      formatDateBr(s.last_validation_date),
      s.validation_location || "—",
    ]),
    ...planilhaDocs.map((d) => [
      d.title,
      d.current_revision,
      formatDateBr(d.current_revision_date || d.current_issue_date),
      d.storage_location || "—",
    ]),
  ];

  if (softwareRows.length) {
    y = sectionTitle(doc, y, "Planilhas / Softwares Controlados");
    y = drawDocTable(
      doc,
      y,
      ["Título", "REV.", "Última validação", "Local"],
      softwareRows,
      { 0: { cellWidth: 90 }, 1: { cellWidth: 20 }, 2: { cellWidth: 35 }, 3: { cellWidth: 35 } },
    );
  }

  if (externals.length) {
    y = sectionTitle(doc, y, "Documentos Externos Controlados");
    y = noteText(doc, y, "A consulta deverá ser realizada semestralmente.");
    y = drawDocTable(
      doc,
      y,
      ["Título", "Local", "Revisão", "Consulta ant.", "Últ. consulta", "Próx.", "Revisão?", "Procedimentos"],
      externals.map((e) => [
        e.title,
        e.consultation_location,
        e.external_revision,
        formatDateBr(e.previous_consultation_date),
        formatDateBr(e.last_consultation_date),
        formatDateBr(e.next_consultation_date),
        e.has_revision ? "Sim" : "Não",
        e.involved_procedures,
      ]),
      EXTERNAL_COL_WIDTHS,
    );
  }

  drawInstitutionalPageFooters(doc);
  const fileName = generateDocumentFileName(
    listaDocRow || {
      code: header.code,
      title: "Lista-Mestra",
      current_revision: header.revision,
      export_file_name_pattern: "{codigo}_{titulo}_Rev{revisao}_{ano}",
    },
    { ano: new Date().getFullYear() },
    "pdf",
  );
  doc.save(fileName);
}
