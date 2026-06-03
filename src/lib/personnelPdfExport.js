import { supabase } from "@/lib/supabaseClient";
import { CADASTRO_STORAGE_BUCKET } from "@/lib/cadastroConstants";
import { getPosition } from "@/lib/personnelPositionsApi";
import { getAdequacy } from "@/lib/personnelAdequaciesApi";
import { getMonitoring } from "@/lib/personnelMonitoringsApi";
import { getExperienceEvaluation } from "@/lib/personnelExperienceEvaluationsApi";
import { getSelection } from "@/lib/personnelSelectionsApi";
import { getAttendanceList } from "@/lib/personnelAttendanceListsApi";

async function loadLogoDataUrl(tenant) {
  if (!tenant?.logo_storage_path) return null;
  const { data, error } = await supabase.storage
    .from("tenant-branding")
    .createSignedUrl(tenant.logo_storage_path, 3600);
  if (error || !data?.signedUrl) return null;
  try {
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

async function loadSignatureDataUrl(storagePath) {
  if (!storagePath) return null;
  const { data, error } = await supabase.storage
    .from(CADASTRO_STORAGE_BUCKET)
    .createSignedUrl(storagePath, 3600);
  if (error || !data?.signedUrl) return null;
  try {
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

export async function exportPositionCompetencyPdf(positionId, tenant) {
  const position = await getPosition(positionId);
  const logoDataUrl = await loadLogoDataUrl(tenant);
  const mod = await import(/* webpackChunkName: "personnel-pdf" */ "@/lib/personnelPdf/drawCompetencyPdf");
  mod.drawCompetencyPdf(position, { logoDataUrl });
}

export async function exportAdequacyPdf(adequacyId, tenant) {
  const record = await getAdequacy(adequacyId);
  const logoDataUrl = await loadLogoDataUrl(tenant);
  const empSnap = record.employee_snapshot || {};
  const approvalId = record.analysis_approval_responsible_id;
  let approvalPath = null;
  if (approvalId) {
    const { data } = await supabase.from("employee_registrations").select("signature_storage_path").eq("id", approvalId).maybeSingle();
    approvalPath = data?.signature_storage_path;
  }
  const [approval, occupant] = await Promise.all([
    loadSignatureDataUrl(approvalPath),
    loadSignatureDataUrl(empSnap.signature_storage_path),
  ]);
  const mod = await import(/* webpackChunkName: "personnel-pdf" */ "@/lib/personnelPdf/drawAdequacyPdf");
  await mod.drawAdequacyPdf(record, { logoDataUrl, signatureUrls: { approval, occupant } });
}

export async function exportMonitoringPdf(monitoringId, tenant) {
  const record = await getMonitoring(monitoringId);
  const logoDataUrl = await loadLogoDataUrl(tenant);
  const empSnap = record.employee_snapshot || {};
  const approvalId = record.analysis_approval_responsible_id;
  let approvalPath = null;
  if (approvalId) {
    const { data } = await supabase.from("employee_registrations").select("signature_storage_path").eq("id", approvalId).maybeSingle();
    approvalPath = data?.signature_storage_path;
  }
  const [approval, occupant] = await Promise.all([
    loadSignatureDataUrl(approvalPath),
    loadSignatureDataUrl(empSnap.signature_storage_path),
  ]);
  const mod = await import(/* webpackChunkName: "personnel-pdf" */ "@/lib/personnelPdf/drawMonitoringPdf");
  await mod.drawMonitoringPdf(record, { logoDataUrl, signatureUrls: { approval, occupant } });
}

export async function exportExperienceEvaluationPdf(evaluationId, tenant) {
  const record = await getExperienceEvaluation(evaluationId);
  const logoDataUrl = await loadLogoDataUrl(tenant);
  const mod = await import(/* webpackChunkName: "personnel-pdf" */ "@/lib/personnelPdf/drawExperienceEvaluationPdf");
  await mod.drawExperienceEvaluationPdf(record, { logoDataUrl });
}

export async function exportSelectionPdf(selectionId, tenant) {
  const record = await getSelection(selectionId);
  const logoDataUrl = await loadLogoDataUrl(tenant);
  let signatureUrl = null;
  if (record.analysis_approval_responsible_id) {
    const { data } = await supabase
      .from("employee_registrations")
      .select("signature_storage_path")
      .eq("id", record.analysis_approval_responsible_id)
      .maybeSingle();
    signatureUrl = await loadSignatureDataUrl(data?.signature_storage_path);
  }
  const mod = await import(/* webpackChunkName: "personnel-pdf" */ "@/lib/personnelPdf/drawPersonnelSelectionPdf");
  await mod.drawPersonnelSelectionPdf(record, { logoDataUrl, signatureUrl });
}

export async function exportAttendanceListPdf(listId, tenant) {
  const record = await getAttendanceList(listId);
  const logoDataUrl = await loadLogoDataUrl(tenant);
  const mod = await import(/* webpackChunkName: "personnel-pdf" */ "@/lib/personnelPdf/drawAttendanceListPdf");
  await mod.drawAttendanceListPdf(record, { logoDataUrl });
}
