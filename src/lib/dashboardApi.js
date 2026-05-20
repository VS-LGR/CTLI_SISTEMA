/**
 * Dashboard — contrato REST (mock em mockBackend.js; backend real deve espelhar).
 *
 * GET /dashboard?tenant_id=
 *   → { total_documents, by_status, by_requirement, recent_documents, pinned_documents, reminders }
 * POST /dashboard/reminders { tenant_id, text }
 * DELETE /dashboard/reminders/:id?tenant_id=
 * PUT /documents/:id { pinned: true|false } (+ demais campos do documento)
 */

import api from "@/lib/api";

export function fetchDashboard(tenantId) {
  return api.get("/dashboard", { params: { tenant_id: tenantId } });
}

export function addDashboardReminder(tenantId, text) {
  return api.post("/dashboard/reminders", { tenant_id: tenantId, text });
}

export function deleteDashboardReminder(tenantId, reminderId) {
  return api.delete(`/dashboard/reminders/${reminderId}`, { params: { tenant_id: tenantId } });
}

export function toggleDocumentPin(documentId, pinned) {
  return api.put(`/documents/${documentId}`, { pinned });
}
