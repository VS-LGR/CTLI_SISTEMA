/** API mínima do editor — sem importar o chunk pesado do docx-editor. */
export async function saveDocxFromEditor(editorRef) {
  if (!editorRef?.current?.save) return null;
  return editorRef.current.save();
}
