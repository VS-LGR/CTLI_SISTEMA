import { supabase } from "@/lib/supabaseClient";

export const TENANT_BRANDING_BUCKET = "tenant-branding";

export function tenantLogoStoragePath(tenantId, filename) {
  const ext = (filename || "logo.png").split(".").pop()?.toLowerCase() || "png";
  const safeExt = ["png", "jpg", "jpeg", "webp"].includes(ext) ? ext : "png";
  return `${tenantId}/logo.${safeExt}`;
}

export function isImageDataUrl(value) {
  return typeof value === "string" && value.startsWith("data:image/");
}

/** Converte blob em data URL (seguro para canvas / jsPDF). */
export function blobToDataUrl(blob) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(typeof reader.result === "string" ? reader.result : null);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(blob);
  });
}

/**
 * Carrega logo do tenant como data URL (evita canvas tainted em PDF).
 * @param {{ logo_storage_path?: string|null }|null|undefined} tenant
 */
export async function loadTenantLogoDataUrl(tenant) {
  if (!tenant?.logo_storage_path) return null;
  const { data, error } = await supabase.storage
    .from(TENANT_BRANDING_BUCKET)
    .createSignedUrl(tenant.logo_storage_path, 3600);
  if (error || !data?.signedUrl) return null;
  try {
    const res = await fetch(data.signedUrl);
    if (!res.ok) return null;
    return await blobToDataUrl(await res.blob());
  } catch {
    return null;
  }
}

/**
 * Normaliza URL assinada ou data URL para data URL (uso em compressão de PDF).
 * @param {string|null|undefined} src
 */
export async function resolveImageDataUrl(src) {
  if (!src) return null;
  if (isImageDataUrl(src)) return src;
  try {
    const res = await fetch(src);
    if (!res.ok) return null;
    return await blobToDataUrl(await res.blob());
  } catch {
    return null;
  }
}
