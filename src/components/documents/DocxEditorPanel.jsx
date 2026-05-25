import React, { useCallback, useEffect, useRef, useState } from "react";
import { DocxEditor } from "@eigenpal/docx-editor-react";
import "@eigenpal/docx-editor-react/styles.css";
import { downloadOriginalFile } from "@/lib/documentsApi";
import { getBlankDocxBuffer } from "@/lib/blankDocx";
import { isDocxFileName } from "@/lib/docxImport";

/**
 * Editor nativo .docx ([docx-editor.dev](https://www.docx-editor.dev)).
 * Carrega o ficheiro do Storage ou um documento vazio.
 */
function DocxEditorPanel({
  doc,
  readOnly = false,
  author,
  editorRef: editorRefProp,
  reloadToken = 0,
}) {
  const internalRef = useRef(null);
  const editorRef = editorRefProp || internalRef;
  const [buffer, setBuffer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadBuffer = useCallback(async () => {
    if (!doc) return;
    setLoading(true);
    setError(null);
    try {
      if (doc.has_file && isDocxFileName(doc.file_name, doc.file_mime)) {
        const blob = await downloadOriginalFile(doc);
        setBuffer(await blob.arrayBuffer());
      } else if (doc.has_file) {
        setError("Este ficheiro não é .docx. Faça upload de um documento Word (.docx).");
        setBuffer(null);
      } else {
        setBuffer(await getBlankDocxBuffer());
      }
    } catch (e) {
      console.error("[DocxEditorPanel] load", e);
      setError(e?.message || "Falha ao carregar o documento");
      setBuffer(null);
    } finally {
      setLoading(false);
    }
  }, [doc]);

  useEffect(() => {
    loadBuffer();
  }, [loadBuffer, reloadToken]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[480px] text-slate-600 text-sm border border-slate-200 rounded-xl bg-white">
        A carregar editor Word…
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl min-h-[200px]">
        {error}
      </div>
    );
  }

  if (!buffer) {
    return (
      <div className="p-6 text-sm text-slate-600 border border-slate-200 rounded-xl min-h-[200px]">
        Sem documento Word para editar. Use &quot;Carregar Word&quot; para enviar um .docx.
      </div>
    );
  }

  return (
    <div
      className="docx-editor-host border border-slate-200 rounded-xl overflow-hidden bg-white min-h-[560px]"
      data-testid="docx-editor-panel"
    >
      <DocxEditor
        ref={editorRef}
        key={`${doc?.id}-${reloadToken}-${buffer.byteLength}`}
        documentBuffer={buffer}
        documentName={doc?.title || "Documento"}
        author={author || "Utilizador"}
        readOnly={readOnly}
        mode={readOnly ? "viewing" : "editing"}
        showToolbar={!readOnly}
        showZoomControl
        className="min-h-[560px]"
        onError={(err) => {
          console.error("[DocxEditor]", err);
          setError(err?.message || "Erro no editor");
        }}
      />
    </div>
  );
}

export default React.memo(DocxEditorPanel, (prev, next) => (
  prev.doc?.id === next.doc?.id
  && prev.doc?.has_file === next.doc?.has_file
  && prev.doc?.file_name === next.doc?.file_name
  && prev.readOnly === next.readOnly
  && prev.author === next.author
  && prev.reloadToken === next.reloadToken
));
