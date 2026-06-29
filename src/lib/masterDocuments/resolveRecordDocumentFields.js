import { resolveDocumentForExport } from "./masterDocumentResolver";

/**
 * Resolve campos de metadados do documento (código, ref. PR, revisão, emissão)
 * a partir da Lista Mestra, para snapshot no registo na criação.
 */
export async function resolveRecordDocumentFields({
  tenantId,
  templateKey,
  code,
  defaultTitle,
  defaultReference = "",
  record = null,
}) {
  const meta = await resolveDocumentForExport({
    tenantId,
    templateKey,
    code,
    record,
    defaultTitle,
  });

  return {
    document_code: meta?.code || code || record?.document_code || "",
    document_reference: meta?.reference || defaultReference || record?.document_reference || "",
    document_revision: meta?.revision || record?.document_revision || "00",
    document_model_issue_date:
      meta?.modelIssueDate || record?.document_model_issue_date || "2025-06-30",
    document_title: meta?.title || defaultTitle || "",
    masterDocumentId: meta?.id || null,
    isObsolete: Boolean(meta?.isObsolete),
  };
}

export function isRecordDocumentStale(recordFields, masterDoc) {
  if (!recordFields || !masterDoc) return false;
  return (
    (masterDoc.revision && masterDoc.revision !== recordFields.document_revision)
    || (masterDoc.code && masterDoc.code !== recordFields.document_code)
    || (masterDoc.reference && masterDoc.reference !== recordFields.document_reference)
  );
}
