import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { drawInstitutionalPdfHeader } from "@/lib/institutionalPdf/drawHeader";
import { drawInstitutionalPageFooters } from "@/lib/institutionalPdf/drawPageFooters";
import { ML, MR, PAGE_W, TEXT } from "@/lib/institutionalPdf/theme";
import { listMasterDocuments, listExternalDocuments, listControlledSoftware } from "@/lib/masterDocuments/masterDocumentsApi";
import { getActiveDocumentByCode } from "@/lib/masterDocuments/masterDocumentResolver";
import { typeLabel, statusLabel } from "@/lib/masterDocuments/masterDocumentConstants";
import { formatDateBr } from "@/lib/quotationRequestDisplay";
import { generateDocumentFileName } from "@/lib/masterDocuments/masterDocumentFileName";

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
  doc.text(text, ML, y);
  return y + 8;
}

const TABLE_MARGIN = { left: ML, right: PAGE_W - MR };

const INTERNAL_COL_WIDTHS = {
  0: { cellWidth: 22 },
  1: { cellWidth: 10 },
  2: { cellWidth: 58 },
  3: { cellWidth: 18 },
  4: { cellWidth: 18 },
  5: { cellWidth: 18 },
  6: { cellWidth: 18 },
  7: { cellWidth: 18 },
};

const EXTERNAL_COL_WIDTHS = {
  0: { cellWidth: 48 },
  1: { cellWidth: 22 },
  2: { cellWidth: 16 },
  3: { cellWidth: 18 },
  4: { cellWidth: 18 },
  5: { cellWidth: 14 },
  6: { cellWidth: 44 },
};

function drawDocTable(doc, startY, headers, rows, columnStyles = INTERNAL_COL_WIDTHS) {
  autoTable(doc, {
    startY,
    head: [headers],
    body: rows,
    margin: TABLE_MARGIN,
    theme: "grid",
    styles: { fontSize: 7, cellPadding: 1.5, overflow: "linebreak", textColor: TEXT },
    headStyles: { fillColor: [240, 240, 240], textColor: TEXT, fontStyle: "bold" },
    columnStyles,
  });
  return doc.lastAutoTable.finalY + 6;
}

export async function exportMasterDocumentListPdf(tenantId, tenant) {
  const [allDocs, externals, software, listaMeta] = await Promise.all([
    listMasterDocuments(tenantId, {}),
    listExternalDocuments(tenantId),
    listControlledSoftware(tenantId),
    getActiveDocumentByCode(tenantId, "RE-8.3A"),
  ]);

  const logoDataUrl = await loadLogoDataUrl(tenant);
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  const header = {
    title: "LISTA MESTRA DE DOCUMENTOS",
    code: listaMeta?.code || "RE-8.3A",
    reference: listaMeta?.reference || "PR-8.3",
    revision: listaMeta?.revision || "03",
    modelIssueDate: listaMeta?.modelIssueDate || listaMeta?.current_issue_date || "2026-06-01",
  };

  let y = drawInstitutionalPdfHeader(doc, header, logoDataUrl);

  const internals = allDocs.filter((d) => d.type !== "documento_externo");
  const manuals = internals.filter((d) => ["manual", "politica", "documento_interno"].includes(d.type));
  const procedures = internals.filter((d) => d.type === "procedimento");
  const records = internals.filter((d) => d.type === "registro");

  const rowMap = (d) => [
    d.code || "—",
    d.current_revision,
    d.title,
    formatDateBr(d.previous_revision_date),
    formatDateBr(d.current_revision_date),
    "—",
    formatDateBr(d.last_critical_analysis_date),
    formatDateBr(d.next_critical_analysis_date),
  ];

  const headers = ["Código", "Rev.", "Título", "Rev. anterior", "Rev. atual", "Distribuição", "Últ. análise", "Próx. análise"];

  y = sectionTitle(doc, y, "Manual e Política");
  y = drawDocTable(doc, y, headers, manuals.map(rowMap));

  y = sectionTitle(doc, y, "Procedimentos");
  y = drawDocTable(doc, y, headers, procedures.map(rowMap));

  y = sectionTitle(doc, y, "Registros da Qualidade");
  y = drawDocTable(doc, y, headers, records.map(rowMap));

  if (software.length) {
    y = sectionTitle(doc, y, "Planilhas / Softwares Controlados");
    y = drawDocTable(
      doc,
      y,
      ["Título", "Revisão", "Última validação", "Status"],
      software.map((s) => [s.title, s.revision, formatDateBr(s.last_validation_date), s.status]),
      { 0: { cellWidth: 90 }, 1: { cellWidth: 20 }, 2: { cellWidth: 35 }, 3: { cellWidth: 35 } },
    );
  }

  if (externals.length) {
    y = sectionTitle(doc, y, "Documentos Externos Controlados");
    y = drawDocTable(
      doc,
      y,
      ["Título", "Local", "Revisão", "Últ. consulta", "Próx.", "Revisão?", "Procedimentos"],
      externals.map((e) => [
        e.title,
        e.consultation_location,
        e.external_revision,
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
    listaMeta || { code: "RE-8.3A", title: "Lista-Mestra", current_revision: "03", export_file_name_pattern: "{codigo}_{titulo}_Rev{revisao}_{ano}" },
    { ano: new Date().getFullYear() },
    "pdf",
  );
  doc.save(fileName);
}
