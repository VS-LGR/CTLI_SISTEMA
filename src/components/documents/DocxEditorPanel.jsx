import React, { useCallback, useEffect, useRef, useState } from "react";
import { DocxEditor } from "@eigenpal/docx-editor-react";
import "@eigenpal/docx-editor-react/styles.css";
import { downloadOriginalFile } from "@/lib/documentsApi";
import { getBlankDocxBuffer } from "@/lib/blankDocx";
import { isDocxFileName } from "@/lib/docxImport";
import { relayoutDocxEditor } from "@/lib/docxEditorSave";

/**
 * Editor nativo .docx ([docx-editor.dev](https://www.docx-editor.dev)).
 */
function DocxEditorPanel({
  doc,
  readOnly = false,
  forceViewing = false,
  author,
  editorRef: editorRefProp,
  reloadToken = 0,
  onDirtyChange,
  onOriginalBufferLoaded,
  printMode = false,
}) {
  const internalRef = useRef(null);
  const editorRef = editorRefProp || internalRef;
  const hostRef = useRef(null);
  const [buffer, setBuffer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const dirtySentRef = useRef(false);

  const scheduleRelayout = useCallback(() => {
    window.requestAnimationFrame(() => {
      relayoutDocxEditor(editorRef);
    });
  }, [editorRef]);

  const loadBuffer = useCallback(async () => {
    if (!doc) return;
    setLoading(true);
    setError(null);
    dirtySentRef.current = false;
    onDirtyChange?.(false);
    try {
      if (doc.has_file && isDocxFileName(doc.file_name, doc.file_mime)) {
        const blob = await downloadOriginalFile(doc);
        const ab = await blob.arrayBuffer();
        setBuffer(ab);
        onOriginalBufferLoaded?.(ab);
      } else if (doc.has_file) {
        setError("Este ficheiro não é .docx. Faça upload de um documento Word (.docx).");
        setBuffer(null);
        onOriginalBufferLoaded?.(null);
      } else {
        const blank = await getBlankDocxBuffer();
        setBuffer(blank);
        onOriginalBufferLoaded?.(blank);
      }
    } catch (e) {
      console.error("[DocxEditorPanel] load", e);
      setError(e?.message || "Falha ao carregar o documento");
      setBuffer(null);
      onOriginalBufferLoaded?.(null);
    } finally {
      setLoading(false);
    }
  }, [doc, onDirtyChange, onOriginalBufferLoaded]);

  useEffect(() => {
    loadBuffer();
  }, [loadBuffer, reloadToken]);

  useEffect(() => {
    if (printMode) {
      hostRef.current?.classList.add("docx-printing");
    } else {
      hostRef.current?.classList.remove("docx-printing");
    }
  }, [printMode]);

  const editing = !readOnly && !forceViewing && !printMode;
  const editorMode = editing ? "editing" : "viewing";

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
      ref={hostRef}
      className="docx-editor-host border border-slate-200 rounded-xl bg-white w-full min-w-0"
      data-testid="docx-editor-panel"
    >
      <DocxEditor
        ref={editorRef}
        key={`${doc?.id}-${reloadToken}`}
        documentBuffer={buffer}
        documentName={doc?.title || "Documento"}
        author={author || "Utilizador"}
        readOnly={!editing}
        mode={editorMode}
        showToolbar={editing}
        showZoomControl
        showMarginGuides={editing}
        showRuler={editing}
        initialZoom={1}
        className="min-h-[min(75vh,820px)] w-full"
        onChange={() => {
          if (!dirtySentRef.current) {
            dirtySentRef.current = true;
            onDirtyChange?.(true);
          }
        }}
        onEditorViewReady={() => scheduleRelayout()}
        onFontsLoaded={() => scheduleRelayout()}
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
  && prev.forceViewing === next.forceViewing
  && prev.printMode === next.printMode
  && prev.author === next.author
  && prev.reloadToken === next.reloadToken
));
