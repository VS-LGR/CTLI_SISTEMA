import {
  PLATFORM_DIAGRAM_PANELS,
  PLATFORM_DIAGRAM_SOURCE,
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

function cropPanelToDataUrl(img, panel) {
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  const sy = Math.round(panel.yStart * h);
  const sh = Math.max(1, Math.round((panel.yEnd - panel.yStart) * h));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = sh;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, sy, w, sh, 0, 0, w, sh);
  return canvas.toDataURL("image/png");
}

async function buildPanelDataUrls() {
  const img = await loadImage(PLATFORM_DIAGRAM_SOURCE);
  return PLATFORM_DIAGRAM_PANELS.map((panel) => ({
    id: panel.id,
    label: panel.label,
    dataUrl: cropPanelToDataUrl(img, panel),
  }));
}

/**
 * Carrega e recorta os 3 painéis de Balanças.png (com cache em memória).
 * @param {string} [tipoPlataforma]
 * @returns {Promise<{ panels: Array<{ id, label, dataUrl }>, activePanelId: string|null, ok: boolean }>}
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
