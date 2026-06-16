import { supabase } from "@/lib/supabaseClient";
import { isSupabaseAuthMode } from "@/lib/api";

export function createDocumentSnapshot(documentMeta, {
  sourceModule,
  sourceRecordId,
  exportFileName,
  fileExtension = "pdf",
  fileVersion = 1,
  generatedById,
  fileUrl = "",
  notes = "",
}) {
  const doc = documentMeta || {};
  return {
    master_document_id: doc.masterDocumentId || doc.id || null,
    source_module: sourceModule || "",
    source_record_id: String(sourceRecordId || ""),
    document_code: doc.code || "",
    document_title: doc.title || "",
    document_reference: doc.reference || "",
    document_revision: doc.revision || doc.current_revision || "00",
    document_issue_date: doc.modelIssueDate || doc.current_issue_date || null,
    document_template_key: doc.templateKey || doc.template_key || "",
    export_file_name: exportFileName || "",
    export_file_name_pattern: doc.exportFileNamePattern || doc.export_file_name_pattern || "",
    file_naming_rule: doc.fileNamingRule || doc.file_naming_rule || "",
    file_extension: fileExtension,
    file_version: fileVersion,
    generated_by_id: generatedById || null,
    generated_at: new Date().toISOString(),
    file_url: fileUrl,
    notes,
  };
}

export async function saveDocumentGeneratedSnapshot(tenantId, snapshotData) {
  if (!isSupabaseAuthMode || !tenantId) return null;
  const row = {
    tenant_id: tenantId,
    ...snapshotData,
  };
  const { data, error } = await supabase
    .from("document_generated_snapshots")
    .insert(row)
    .select()
    .single();
  if (error) {
    console.warn("Falha ao salvar snapshot documental:", error.message);
    return null;
  }
  return data;
}

export async function listSnapshotsForDocument(tenantId, masterDocumentId) {
  if (!isSupabaseAuthMode) return [];
  const { data, error } = await supabase
    .from("document_generated_snapshots")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("master_document_id", masterDocumentId)
    .order("generated_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function listSnapshotsForSource(tenantId, sourceModule, sourceRecordId) {
  if (!isSupabaseAuthMode) return [];
  const { data, error } = await supabase
    .from("document_generated_snapshots")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("source_module", sourceModule)
    .eq("source_record_id", String(sourceRecordId))
    .order("generated_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getLatestSnapshotForSource(tenantId, sourceModule, sourceRecordId) {
  const list = await listSnapshotsForSource(tenantId, sourceModule, sourceRecordId);
  return list[0] || null;
}
