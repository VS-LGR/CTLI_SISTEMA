import {
  PLATFORM_DIAGRAM_PANELS,
  resolveActivePlatformPanel,
  platformPanelDisplayLabel,
} from "./platformDiagramAssets";

let cachedPanels = null;
let loadPromise = null;

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Falha ao carregar imagem: ${src}`));
    img.src = src;
  });
}

function imageToPngDataUrl(img) {
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, w, h);
  return {
    dataUrl: canvas.toDataURL("image/png"),
    aspectRatio: w / h,
  };
}

async function loadPanelAsset(panel) {
  const img = await loadImage(panel.src);
  const { dataUrl, aspectRatio } = imageToPngDataUrl(img);
  return {
    id: panel.id,
    label: panel.label,
    dataUrl,
    aspectRatio,
  };
}

async function buildPanelDataUrls() {
  return Promise.all(PLATFORM_DIAGRAM_PANELS.map(loadPanelAsset));
}

/**
 * Carrega os 3 diagramas WebP de plataforma (com cache em memória).
 * @param {string} [tipoPlataforma]
 * @returns {Promise<{ panels: Array<{ id, label, dataUrl, aspectRatio }>, activePanelId: string|null, ok: boolean }>}
 */
export async function loadPlatformDiagramPanels(tipoPlataforma = "") {
  const activePanelId = resolveActivePlatformPanel(tipoPlataforma);

  try {
    if (!cachedPanels) {
      if (!loadPromise) loadPromise = buildPanelDataUrls();
      cachedPanels = await loadPromise;
    }

    const panels = cachedPanels.map((p) => ({
      ...p,
      displayLabel: platformPanelDisplayLabel(
        PLATFORM_DIAGRAM_PANELS.find((def) => def.id === p.id) || { id: p.id, label: p.label },
        tipoPlataforma,
      ),
    }));

    return { panels, activePanelId, ok: true };
  } catch {
    return { panels: [], activePanelId, ok: false };
  }
}

/** Limpa cache (útil em testes). */
export function clearPlatformDiagramCache() {
  cachedPanels = null;
  loadPromise = null;
}
