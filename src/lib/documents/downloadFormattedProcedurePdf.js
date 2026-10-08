import { supabase } from "@/lib/supabaseClient";
import { docxBlobToHtml } from "@/lib/docxImport";
import { loadTenantLogoDataUrl } from "@/lib/tenantBranding";
import { findMasterDocumentByCode, listDocumentRevisions, listDocumentDistributions } from "@/lib/masterDocuments/masterDocumentsApi";
import { documentIdentity, htmlToBlocks } from "@/lib/documents/formattedProcedureModel";
import { renderFormattedProcedurePdf } from "@/lib/documents/formattedProcedureLayout";

function masterLookupCode(docRecord) {
  return documentIdentity(docRecord).code;
}

/**
 * PDF de leitura: folha de controlo + corpo com tabelas e imagens.
 * Lê os campos e o Word no momento da descarga. Não grava nem bloqueia a edição.
 */
export async function downloadFormattedProcedurePdf(docRecord, { mode = "download" } = {}) {
  const isProcedure = docRecord?.section === "procedimento";
  const tenantId = docRecord?.tenant_id;
  const identity = documentIdentity(docRecord);
  let logoDataUrl = null;
  let distributions = [];
  let revisions = [];
  let signatures = [];

  if (tenantId) {
    const { data: tenant } = await supabase
      .from("tenants")
      .select("id, logo_storage_path, name")
      .eq("id", tenantId)
      .maybeSingle();
    logoDataUrl = await loadTenantLogoDataUrl(tenant);
    const lookupCode = masterLookupCode(docRecord);
    if (isProcedure && lookupCode && lookupCode !== "—") {
      const master = await findMasterDocumentByCode(tenantId, lookupCode).catch(() => null);
      if (master?.id) {
        distributions = await listDocumentDistributions(tenantId, master.id).catch(() => []);
        revisions = await listDocumentRevisions(tenantId, master.id).catch(() => []);
      }
    }
    const { data: signs } = await supabase
      .from("tenant_documents")
      .select("title, responsible, version")
      .eq("tenant_id", tenantId)
      .eq("section", "assinatura")
      .order("title");
    signatures = signs || [];
  }

  let html = "";
  if (docRecord?.has_file) {
    const { downloadOriginalFile } = await import("@/lib/documentsApi");
    const blob = await downloadOriginalFile(docRecord);
    html = await docxBlobToHtml(blob);
  } else if (docRecord?.content_html) {
    html = docRecord.content_html;
  }

  const doc = renderFormattedProcedurePdf({
    identity,
    isProcedure,
    distributions,
    revisions,
    signatures,
    blocks: htmlToBlocks(html),
    logoDataUrl,
  });

  const safeName = String(identity.title).replace(/[^\w\- ]+/g, "").trim() || "documento";
  if (mode === "print") {
    doc.autoPrint();
    const url = doc.output("bloburl");
    const opened = window.open(url, "_blank", "noopener,noreferrer");
    if (!opened) doc.save(`${safeName}-formatado.pdf`);
    return;
  }
  doc.save(`${safeName}-formatado.pdf`);
}
