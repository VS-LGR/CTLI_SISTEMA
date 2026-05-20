function norm(s) {
  return String(s ?? "").trim().toLowerCase();
}

/**
 * @param {Array<Record<string, unknown>>} rows
 * @param {string} query
 * @param {(row: Record<string, unknown>) => string[]} getHaystack
 */
export function filterCadastroByQuery(rows, query, getHaystack) {
  const q = norm(query);
  if (!q) return rows || [];
  return (rows || []).filter((row) => {
    const haystack = getHaystack(row).map(norm).join(" ");
    return haystack.includes(q);
  });
}

/** @param {string | null | undefined} expiryDate ISO date */
export function weightCertCalibrationStatus(expiryDate) {
  if (!expiryDate) return { label: "—", vigente: null };
  const today = new Date().toISOString().slice(0, 10);
  const vigente = String(expiryDate) >= today;
  return {
    label: vigente ? "Calibração Vigente" : "Calibração Vencida",
    vigente,
  };
}

/**
 * Resolve certificado vinculado ao peso (FK ou número).
 * @param {Record<string, unknown>} item standard_weight_items row
 * @param {Array<Record<string, unknown>>} weightCerts
 */
export function resolveWeightItemCert(item, weightCerts) {
  if (!item) return null;
  if (item.weight_certificate_id) {
    return weightCerts.find((c) => c.id === item.weight_certificate_id) || null;
  }
  const num = String(item.certificate_number || "").trim();
  if (!num) return null;
  return weightCerts.find((c) => String(c.certificate_number || "").trim() === num) || null;
}

export function weightItemCertNumber(item, weightCerts) {
  const cert = resolveWeightItemCert(item, weightCerts);
  if (cert?.certificate_number) return cert.certificate_number;
  return item?.certificate_number || "—";
}

export function weightItemCertStatus(item, weightCerts) {
  const cert = resolveWeightItemCert(item, weightCerts);
  if (!cert?.expiry_date) return weightCertCalibrationStatus(null);
  return weightCertCalibrationStatus(cert.expiry_date);
}

/** Tamanho legível em bytes */
export function formatFileSize(bytes) {
  if (bytes == null || Number.isNaN(Number(bytes))) return "—";
  const n = Number(bytes);
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
