export const TENANT_BRANDING_BUCKET = "tenant-branding";

export function tenantLogoStoragePath(tenantId, filename) {
  const ext = (filename || "logo.png").split(".").pop()?.toLowerCase() || "png";
  const safeExt = ["png", "jpg", "jpeg", "webp"].includes(ext) ? ext : "png";
  return `${tenantId}/logo.${safeExt}`;
}
