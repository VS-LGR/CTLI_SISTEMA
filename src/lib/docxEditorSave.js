import { saveDocxWithFidelity } from "@/lib/docxSaveFidelity";

export { saveDocxWithFidelity };

/** Abre impressão do editor (PDF fiel). */
export function printDocxFromEditor(editorRef, { onBeforePrint } = {}) {
  if (!editorRef?.current?.print) return false;
  try {
    onBeforePrint?.();
  } catch { /* optional */ }
  editorRef.current.print();
  return true;
}

/** Força relayout após fontes/página carregada. */
export function relayoutDocxEditor(editorRef) {
  editorRef?.current?.getEditorRef?.()?.relayout?.();
}
