import {
  CERTIFICATE_DOC_CODE,
  CERTIFICATE_TEMPLATE_KEY,
} from "@/lib/calibrationCertificates/certificateSchema";

export function observationsLinesToArray(text) {
  if (!text || typeof text !== "string") return [];
  return text
    .split(/\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function observationsArrayToLines(items) {
  if (!Array.isArray(items)) return "";
  return items
    .map((item) => String(item).trim())
    .filter(Boolean)
    .join("\n");
}

export function isCertificateMasterDocument(doc) {
  if (!doc) return false;
  return doc.code === CERTIFICATE_DOC_CODE || doc.template_key === CERTIFICATE_TEMPLATE_KEY;
}

export function getCertificateObservationsFromConfig(exportTemplateConfig) {
  const cfg = exportTemplateConfig && typeof exportTemplateConfig === "object"
    ? exportTemplateConfig
    : {};
  const obs = cfg.certificateObservations;
  if (!obs || typeof obs !== "object") return null;
  return {
    rbc: Array.isArray(obs.rbc) ? obs.rbc.map((item) => String(item).trim()).filter(Boolean) : [],
    rastreavel: Array.isArray(obs.rastreavel)
      ? obs.rastreavel.map((item) => String(item).trim()).filter(Boolean)
      : [],
  };
}

export function buildExportTemplateConfigWithObservations(existingConfig, { rbcText, rastreavelText } = {}) {
  const base = existingConfig && typeof existingConfig === "object" ? { ...existingConfig } : {};
  return {
    ...base,
    certificateObservations: {
      rbc: observationsLinesToArray(rbcText),
      rastreavel: observationsLinesToArray(rastreavelText),
    },
  };
}
