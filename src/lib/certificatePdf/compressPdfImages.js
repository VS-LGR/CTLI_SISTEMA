import { isImageDataUrl, resolveImageDataUrl } from "@/lib/tenantBranding";

/** Formato jsPDF a partir de data URL (JPEG comprime melhor que PNG em anexos). */
export function pdfImageFormat(dataUrl) {
  return typeof dataUrl === "string" && dataUrl.startsWith("data:image/jpeg") ? "JPEG" : "PNG";
}

/**
 * Resolução alvo derivada do tamanho no PDF (~3× para impressão nítida).
 * Diagramas ~48×26 mm, logo ~32×13 mm, assinatura ~55×9 mm.
 */
export const PDF_PLATFORM_EXPORT_MAX_PX = 360;
export const PDF_PLATFORM_MIN_PX = 280;
export const PDF_PLATFORM_EMAIL_MAX_PX = 300;

/**
 * Escala elemento img para data URL (jsPDF embute bitmap em resolução nativa).
 * @param {HTMLImageElement} img
 * @param {number} maxPx
 * @param {{ minPx?: number, mime?: string, quality?: number }} opts
 * @returns {{ dataUrl: string, aspectRatio: number }}
 */
export function scaledDataUrlFromImageElement(
  img,
  maxPx = PDF_PLATFORM_EXPORT_MAX_PX,
  { minPx = 0, mime = "image/png", quality = 0.92 } = {},
) {
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  if (!w || !h) {
    return { dataUrl: "", aspectRatio: 1 };
  }
  let scale = Math.min(1, maxPx / Math.max(w, h));
  if (minPx > 0 && Math.max(w, h) * scale < minPx) {
    scale = minPx / Math.max(w, h);
  }
  const cw = Math.max(1, Math.round(w * scale));
  const ch = Math.max(1, Math.round(h * scale));
  const canvas = document.createElement("canvas");
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return { dataUrl: "", aspectRatio: cw / ch };
  }
  if (scale > 1) {
    ctx.imageSmoothingEnabled = false;
  }
  ctx.drawImage(img, 0, 0, cw, ch);
  try {
    return { dataUrl: canvas.toDataURL(mime, quality), aspectRatio: cw / ch };
  } catch {
    return { dataUrl: "", aspectRatio: cw / ch };
  }
}

/**
 * Reduz resolução de imagem embutida no PDF (jsPDF não escala o bitmap internamente).
 * @param {string|null} dataUrl
 * @param {number} maxPx maior lado máximo em pixels
 * @param {{ minPx?: number, mime?: string, quality?: number }} opts
 */
export async function downscaleDataUrl(
  dataUrl,
  maxPx = 320,
  { minPx = 0, mime = "image/jpeg", quality = 0.85 } = {},
) {
  if (!dataUrl || !maxPx) return dataUrl;
  const resolved = isImageDataUrl(dataUrl) ? dataUrl : await resolveImageDataUrl(dataUrl);
  if (!resolved) return null;

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;
      const longest = Math.max(w, h);
      if (longest <= maxPx && (!minPx || longest >= minPx)) {
        resolve(resolved);
        return;
      }
      const { dataUrl: scaled } = scaledDataUrlFromImageElement(img, maxPx, { minPx, mime, quality });
      resolve(scaled || resolved);
    };
    img.onerror = () => resolve(resolved);
    img.src = resolved;
  });
}

const EXPORT_PRESET = {
  logoMaxPx: 200,
  logoMime: "image/png",
  logoQuality: 0.92,
  /** Só signatário entra no PDF (~55×9 mm). */
  signatureMaxPx: 280,
  signatureQuality: 0.88,
  signatureMime: "image/jpeg",
  platformMaxPx: PDF_PLATFORM_EXPORT_MAX_PX,
  platformMime: "image/png",
  platformQuality: 1,
  /** Diagramas já vêm dimensionados em loadPlatformDiagrams. */
  recompressPlatform: false,
};

const EMAIL_PRESET = {
  logoMaxPx: 180,
  logoMime: "image/png",
  logoQuality: 0.9,
  signatureMaxPx: 260,
  signatureQuality: 0.85,
  signatureMime: "image/jpeg",
  platformMaxPx: PDF_PLATFORM_EMAIL_MAX_PX,
  platformMime: "image/png",
  platformQuality: 1,
  recompressPlatform: true,
};

/** Comprime logo, assinaturas e diagramas antes de embutir no PDF. */
export async function prepareCertificatePdfAssets(
  {
    logoDataUrl,
    signatureUrls,
    platformDiagrams,
  } = {},
  { forEmail = false } = {},
) {
  const preset = forEmail ? EMAIL_PRESET : EXPORT_PRESET;

  const [logo, signatory, panels] = await Promise.all([
    logoDataUrl
      ? downscaleDataUrl(logoDataUrl, preset.logoMaxPx, {
        mime: preset.logoMime,
        quality: preset.logoQuality,
      })
      : null,
    signatureUrls?.signatory
      ? downscaleDataUrl(signatureUrls.signatory, preset.signatureMaxPx, {
        mime: preset.signatureMime,
        quality: preset.signatureQuality,
      })
      : null,
    preset.recompressPlatform && platformDiagrams?.panels?.length
      ? Promise.all(
        platformDiagrams.panels.map(async (panel) => ({
          ...panel,
          dataUrl: panel.dataUrl
            ? await downscaleDataUrl(panel.dataUrl, preset.platformMaxPx, {
              mime: preset.platformMime,
              quality: preset.platformQuality,
            })
            : panel.dataUrl,
        })),
      )
      : null,
  ]);

  return {
    logoDataUrl: logo || logoDataUrl,
    signatureUrls: {
      executor: signatureUrls?.executor ?? null,
      signatory: signatory ?? signatureUrls?.signatory ?? null,
    },
    platformDiagrams: panels
      ? { ...platformDiagrams, panels }
      : platformDiagrams,
  };
}

/** @deprecated use prepareCertificatePdfAssets(..., { forEmail: true }) */
export async function compressAssetsForEmailPdf(assets) {
  return prepareCertificatePdfAssets(assets, { forEmail: true });
}
