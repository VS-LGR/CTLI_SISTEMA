import { saveDocxWithFidelity } from "@/lib/docxSaveFidelity";

/** Gravação simples (legacy). Preferir saveDocxWithFidelity. */
export async function saveDocxFromEditor(editorRef, options = {}) {
  if (!editorRef?.current?.save) return null;
  const selective = options.selective !== false;
  return editorRef.current.save(selective ? { selective: true } : { selective: false });
}

export { saveDocxWithFidelity };

/** Abre impressão do editor (PDF fiel). Opcional: callback antes de print. */
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
