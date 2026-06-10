export {
  exportPositionCompetencyPdf,
  exportAdequacyPdf,
  exportMonitoringPdf,
  exportExperienceEvaluationPdf,
  exportSelectionPdf,
  exportAttendanceListPdf,
} from "@/lib/personnelPdfExport";

import {
  exportPositionCompetencyPdf,
  exportAdequacyPdf,
  exportMonitoringPdf,
  exportExperienceEvaluationPdf,
  exportSelectionPdf,
  exportAttendanceListPdf,
} from "@/lib/personnelPdfExport";
import {
  generateCompetencyDocx,
  generateAdequacyDocx,
  generateMonitoringDocx,
  generateExperienceDocx,
  generateSelectionDocx,
  generateAttendanceDocx,
} from "@/lib/personnelDocx/generatePersonnelDocx";
import { getPosition } from "@/lib/personnelPositionsApi";
import { getAdequacy } from "@/lib/personnelAdequaciesApi";
import { getMonitoring } from "@/lib/personnelMonitoringsApi";
import { getExperienceEvaluation } from "@/lib/personnelExperienceEvaluationsApi";
import { getSelection } from "@/lib/personnelSelectionsApi";
import { getAttendanceList } from "@/lib/personnelAttendanceListsApi";

export async function exportPositionCompetencyDocx(positionId, tenant) {
  void tenant;
  const position = await getPosition(positionId);
  await generateCompetencyDocx(position);
}

export async function exportAdequacyDocx(adequacyId, tenant) {
  void tenant;
  const record = await getAdequacy(adequacyId);
  await generateAdequacyDocx(record);
}

export async function exportMonitoringDocx(monitoringId, tenant) {
  void tenant;
  const record = await getMonitoring(monitoringId);
  await generateMonitoringDocx(record);
}

export async function exportExperienceEvaluationDocx(evaluationId, tenant) {
  void tenant;
  const record = await getExperienceEvaluation(evaluationId);
  await generateExperienceDocx(record);
}

export async function exportSelectionDocx(selectionId, tenant) {
  void tenant;
  const record = await getSelection(selectionId);
  await generateSelectionDocx(record);
}

export async function exportAttendanceListDocx(listId, tenant) {
  void tenant;
  const record = await getAttendanceList(listId);
  await generateAttendanceDocx(record);
}

const EXPORT_HANDLERS = {
  competency: { pdf: exportPositionCompetencyPdf, docx: exportPositionCompetencyDocx },
  adequacy: { pdf: exportAdequacyPdf, docx: exportAdequacyDocx },
  monitoring: { pdf: exportMonitoringPdf, docx: exportMonitoringDocx },
  experience: { pdf: exportExperienceEvaluationPdf, docx: exportExperienceEvaluationDocx },
  selection: { pdf: exportSelectionPdf, docx: exportSelectionDocx },
  attendance: { pdf: exportAttendanceListPdf, docx: exportAttendanceListDocx },
};

export async function exportPersonnelDocument(type, format, id, tenant) {
  const handler = EXPORT_HANDLERS[type]?.[format];
  if (!handler) throw new Error(`Exportação não suportada: ${type}/${format}`);
  await handler(id, tenant);
}
