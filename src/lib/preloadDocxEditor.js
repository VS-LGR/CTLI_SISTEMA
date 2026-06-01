import { allowsRichEditor } from "@/lib/documentFolderConfig";

let chunkPromise = null;

function loadDocxEditorChunk() {
  return import(
    /* webpackPrefetch: true */
    /* webpackChunkName: "docx-editor" */
    "@/components/documents/DocxEditorPanel"
  );
}

/** Carrega o chunk do DocxEditorPanel (idempotente, com retry após falha de rede/cache). */
export function preloadDocxEditorPanel() {
  if (!chunkPromise) {
    chunkPromise = loadDocxEditorChunk().catch((err) => {
      chunkPromise = null;
      return new Promise((resolve, reject) => {
        window.setTimeout(() => {
          loadDocxEditorChunk().then(resolve).catch(reject);
        }, 400);
      });
    });
  }
  return chunkPromise;
}

/**
 * Prefetch em idle — não bloqueia paint nem interação.
 * Usar em hover de links ou após saber que o doc usa editor Word.
 */
export function scheduleDocxEditorPreload() {
  if (typeof window === "undefined") return;
  const run = () => {
    preloadDocxEditorPanel().catch(() => {
      chunkPromise = null;
    });
  };
  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(run, { timeout: 2500 });
  } else {
    window.setTimeout(run, 1);
  }
}

export function documentUsesDocxEditor(doc) {
  if (!doc) return false;
  return allowsRichEditor(doc.requirement, doc.folder_key)
    && doc.section !== "documento"
    && doc.section !== "assinatura";
}
