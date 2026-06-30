/** Formato jsPDF a partir de data URL (JPEG comprime melhor que PNG em anexos). */
export function pdfImageFormat(dataUrl) {
  return typeof dataUrl === "string" && dataUrl.startsWith("data:image/jpeg") ? "JPEG" : "PNG";
}

/**
 * Reduz resolução de imagem embutida no PDF (jsPDF não escala o bitmap internamente).
 * @param {string|null} dataUrl
 * @param {number} maxPx maior lado máximo em pixels
 * @param {{ mime?: string, quality?: number }} opts
 */
export function downscaleDataUrl(dataUrl, maxPx = 320, { mime = "image/jpeg", quality = 0.78 } = {}) {
  if (!dataUrl || !maxPx) return Promise.resolve(dataUrl);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;
      if (!w || !h) {
        resolve(dataUrl);
        return;
      }
      const scale = Math.min(1, maxPx / Math.max(w, h));
      const cw = Math.max(1, Math.round(w * scale));
      const ch = Math.max(1, Math.round(h * scale));
      const canvas = document.createElement("canvas");
      canvas.width = cw;
      canvas.height = ch;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, cw, ch);
      try {
        resolve(canvas.toDataURL(mime, quality));
      } catch {
        resolve(canvas.toDataURL("image/png"));
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/** Comprime logo, assinaturas e diagramas de plataforma para caber no limite da Edge Function. */
export async function compressAssetsForEmailPdf({
  logoDataUrl,
  signatureUrls,
  platformDiagrams,
} = {}) {
  const [logo, executor, signatory, panels] = await Promise.all([
    logoDataUrl ? downscaleDataUrl(logoDataUrl, 220, { mime: "image/png" }) : null,
    signatureUrls?.executor ? downscaleDataUrl(signatureUrls.executor, 360) : null,
    signatureUrls?.signatory ? downscaleDataUrl(signatureUrls.signatory, 360) : null,
    platformDiagrams?.panels?.length
      ? Promise.all(
        platformDiagrams.panels.map(async (panel) => ({
          ...panel,
          dataUrl: panel.dataUrl
            ? await downscaleDataUrl(panel.dataUrl, 260)
            : panel.dataUrl,
        })),
      )
      : null,
  ]);

  return {
    logoDataUrl: logo || logoDataUrl,
    signatureUrls: {
      executor: executor ?? signatureUrls?.executor ?? null,
      signatory: signatory ?? signatureUrls?.signatory ?? null,
    },
    platformDiagrams: panels
      ? { ...platformDiagrams, panels }
      : platformDiagrams,
  };
}
