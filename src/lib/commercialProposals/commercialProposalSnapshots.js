import { emptyClientSnapshot } from "./commercialProposalSchema";

export function buildClientSnapshot(endCustomer, formFields = {}) {
  const base = emptyClientSnapshot();
  if (endCustomer) {
    return {
      ...base,
      company: endCustomer.name || "",
      address: endCustomer.full_address || "",
      attention_to: endCustomer.representative_name || "",
      phone: endCustomer.phone || "",
      email: endCustomer.email || "",
      cnpj: endCustomer.cnpj || "",
      department: formFields.department || base.department,
      ...formFields,
    };
  }
  return { ...base, ...formFields };
}

export function applyEndCustomerToSnapshot(snapshot, endCustomer, overrides = {}) {
  if (!endCustomer) return { ...snapshot, ...overrides };
  return buildClientSnapshot(endCustomer, {
    department: snapshot?.department || "",
    ...overrides,
  });
}
