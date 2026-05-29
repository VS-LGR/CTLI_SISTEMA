import { JOB_ROLES } from "@/lib/cadastroConstants";
import {
  buildClientEnvironmentSnapshot,
  buildEmployeeSnapshot,
  buildSupplierSnapshot,
} from "@/lib/purchaseOrderSnapshots";

export { buildClientEnvironmentSnapshot, buildSupplierSnapshot };

function jobRoleLabel(role) {
  return JOB_ROLES.find((r) => r.value === role)?.label || role || "";
}

export function buildSentBySnapshot(row) {
  if (!row) return {};
  return {
    id: row.id,
    full_name: row.full_name || "",
    job_role: row.job_role || "",
    job_role_label: jobRoleLabel(row.job_role),
  };
}

export function buildRequesterSnapshot(tenant) {
  const snap = buildClientEnvironmentSnapshot(tenant);
  return {
    legal_name: snap.legal_name || "",
    address: [snap.address, snap.cep, snap.city, snap.state].filter(Boolean).join(" — "),
    phone: snap.phone || "",
    email: snap.email || "",
    cnpj: snap.cnpj || "",
    sent_by: "",
  };
}

export function mergeSentByIntoClientSnapshot(clientSnap, sentBySnap) {
  return {
    ...clientSnap,
    sent_by: sentBySnap?.full_name || clientSnap?.environment_responsible || "",
  };
}
