export function buildEmployeeSnapshot(employee) {
  if (!employee) return {};
  return {
    id: employee.id,
    full_name: employee.full_name || "",
    job_role: employee.job_role || "",
    signature_storage_path: employee.signature_storage_path || "",
    registration_code: employee.registration_code || "",
  };
}

export function buildEndCustomerSnapshot(customer) {
  if (!customer) return {};
  return {
    id: customer.id,
    name: customer.name || "",
    trade_name: customer.trade_name || "",
    cnpj: customer.cnpj || "",
    address: customer.address || "",
    representative_name: customer.representative_name || "",
    email: customer.email || "",
  };
}

export function buildTechnicalSnapshot({
  certificate,
  points,
  standards,
  environmental,
  conformity,
  endCustomer,
  executor,
  signatory,
  collectionRow,
}) {
  return {
    clientSnapshot: buildEndCustomerSnapshot(endCustomer),
    balanceSnapshot: certificate.balance_snapshot || {},
    collectionSnapshot: certificate.collection_snapshot || { id: collectionRow?.id },
    environmentalConditionsSnapshot: environmental || {},
    standardsSnapshot: (standards || []).map((s) => ({ ...s, snapshot: s.snapshot || {} })),
    calibrationPointsSnapshot: points || [],
    uncertaintySnapshot: (points || []).map((p) => p.calculation_memory || {}),
    conformitySnapshot: conformity || {},
    executorSnapshot: buildEmployeeSnapshot(executor),
    signatorySnapshot: buildEmployeeSnapshot(signatory),
    eccentricitySnapshot: certificate.eccentricity_snapshot || {},
    controlSnapshot: certificate.control_snapshot || {},
    generatedAt: new Date().toISOString(),
  };
}
