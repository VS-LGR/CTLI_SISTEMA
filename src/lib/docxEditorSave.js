/** API mínima do editor — sem importar o chunk pesado do docx-editor. */
export async function saveDocxFromEditor(editorRef) {
  if (!editorRef?.current?.save) return null;
  return editorRef.current.save();
}

/** Abre pré-visualização de impressão do editor (PDF com cabeçalho/rodapé Word). */
export function printDocxFromEditor(editorRef) {
  if (editorRef?.current?.print) {
    editorRef.current.print();
    return true;
  }
  return false;
}
