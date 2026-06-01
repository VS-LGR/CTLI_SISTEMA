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
  documentMode = "viewing",
  author,
  editorRef: editorRefProp,
  hostRef: hostRefProp,
  reloadToken = 0,
  onDirtyChange,
  onOriginalBufferLoaded,
  printMode = false,
}) {
  const internalRef = useRef(null);
  const editorRef = editorRefProp || internalRef;
  const internalHostRef = useRef(null);
  const hostRef = hostRefProp || internalHostRef;
  const [buffer, setBuffer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const dirtySentRef = useRef(false);
  const onDirtyChangeRef = useRef(onDirtyChange);
  const onOriginalBufferLoadedRef = useRef(onOriginalBufferLoaded);
  onDirtyChangeRef.current = onDirtyChange;
  onOriginalBufferLoadedRef.current = onOriginalBufferLoaded;

  const scheduleRelayout = useCallback(() => {
    window.requestAnimationFrame(() => {
      relayoutDocxEditor(editorRef);
    });
  }, [editorRef]);

  const docRef = useRef(doc);
  docRef.current = doc;

  useEffect(() => {
    let cancelled = false;
    const currentDoc = docRef.current;
    if (!currentDoc) return undefined;

    const run = async () => {
      setLoading(true);
      setError(null);
      dirtySentRef.current = false;
      onDirtyChangeRef.current?.(false);
      try {
        if (currentDoc.has_file && isDocxFileName(currentDoc.file_name, currentDoc.file_mime)) {
          const blob = await downloadOriginalFile(currentDoc);
          const ab = await blob.arrayBuffer();
          if (cancelled) return;
          setBuffer(ab);
          onOriginalBufferLoadedRef.current?.(ab);
        } else if (currentDoc.has_file) {
          if (cancelled) return;
          setError("Este ficheiro não é .docx. Faça upload de um documento Word (.docx).");
          setBuffer(null);
          onOriginalBufferLoadedRef.current?.(null);
        } else {
          const blank = await getBlankDocxBuffer();
          if (cancelled) return;
          setBuffer(blank);
          onOriginalBufferLoadedRef.current?.(blank);
        }
      } catch (e) {
        if (cancelled) return;
        console.error("[DocxEditorPanel] load", e);
        setError(e?.message || "Falha ao carregar o documento");
        setBuffer(null);
        onOriginalBufferLoadedRef.current?.(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [doc?.id, doc?.has_file, doc?.file_name, doc?.file_mime, reloadToken]);

  useEffect(() => {
    if (printMode) {
      hostRef.current?.classList.add("docx-printing");
    } else {
      hostRef.current?.classList.remove("docx-printing");
    }
  }, [printMode, hostRef]);

  const editing = !readOnly && documentMode === "editing" && !printMode;
  const editorMode = editing ? "editing" : "viewing";

  useEffect(() => {
    if (!editing || !buffer || loading) return;
    const frameId = window.requestAnimationFrame(() => {
      editorRef.current?.focus?.();
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [editing, buffer, loading, documentMode, reloadToken, editorRef]);

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
        key={`${doc?.id}-${reloadToken}-${documentMode}`}
        documentBuffer={buffer}
        documentName={doc?.title || "Documento"}
        author={author || "Utilizador"}
        readOnly={readOnly}
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
            onDirtyChangeRef.current?.(true);
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
  && prev.documentMode === next.documentMode
  && prev.printMode === next.printMode
  && prev.author === next.author
  && prev.reloadToken === next.reloadToken
));
