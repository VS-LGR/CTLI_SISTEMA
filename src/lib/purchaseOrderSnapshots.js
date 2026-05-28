import { JOB_ROLES } from "@/lib/cadastroConstants";

function jobRoleLabel(role) {
  return JOB_ROLES.find((r) => r.value === role)?.label || role || "";
}

export function buildSupplierSnapshot(row) {
  if (!row) return {};
  return {
    company: row.name || "",
    contact: row.representative_name || "",
    address: row.full_address || "",
    phone: row.phone || "",
    cnpj: row.cnpj || "",
    email: row.email || "",
  };
}

export function buildClientEnvironmentSnapshot(tenant) {
  if (!tenant) return {};
  const name = tenant.legal_name || tenant.name || "";
  return {
    legal_name: name,
    trade_name: tenant.trade_name || tenant.name || "",
    address: tenant.billing_address || "",
    cep: tenant.billing_cep || "",
    city: tenant.billing_city || "",
    state: tenant.billing_state || "",
    phone: tenant.billing_phone || "",
    email: tenant.billing_email || "",
    cnpj: tenant.billing_cnpj || "",
    state_registration: tenant.billing_state_registration || "",
    environment_responsible: tenant.environment_responsible_name || "",
  };
}

export function buildEmployeeSnapshot(row, signatureUrl = null) {
  if (!row) return {};
  return {
    id: row.id,
    full_name: row.full_name || "",
    job_role: row.job_role || "",
    job_role_label: jobRoleLabel(row.job_role),
    signature_storage_path: row.signature_storage_path || "",
    signature_url: signatureUrl || null,
  };
}
