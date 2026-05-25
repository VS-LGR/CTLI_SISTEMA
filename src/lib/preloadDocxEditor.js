import { allowsRichEditor } from "@/lib/documentFolderConfig";

let chunkPromise = null;

/** Carrega o chunk do DocxEditorPanel (idempotente). */
export function preloadDocxEditorPanel() {
  if (!chunkPromise) {
    chunkPromise = import(
      /* webpackPrefetch: true */
      /* webpackChunkName: "docx-editor" */
      "@/components/documents/DocxEditorPanel"
    );
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
