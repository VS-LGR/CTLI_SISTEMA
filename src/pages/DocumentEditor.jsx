import React, { useCallback, useEffect, useState, useRef, Suspense, useMemo } from "react";
import { useParams, Link, useNavigate, useSearchParams, useNavigation } from "react-router-dom";
import { loadTenantResponsibles } from "@/lib/tenantResponsiblesApi";
import { saveDocxWithFidelity, printDocxFromEditor } from "@/lib/docxEditorSave";
import { documentUsesDocxEditor, scheduleDocxEditorPreload } from "@/lib/preloadDocxEditor";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
import EditorErrorBoundary from "@/components/documents/EditorErrorBoundary";
import {
  getDocument, updateDocument, uploadDocumentFile, exportDocumentBlob,
  downloadOriginalFile, duplicateDocument, toggleDocumentPin as togglePinApi,
} from "@/lib/documentsApi";
import { triggerBlobDownload } from "@/lib/blobDownload";
import { isDocxFile, isDocxFileName } from "@/lib/docxFileUtils";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import DocumentEditorMetaCard from "@/components/documents/DocumentEditorMetaCard";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  FloppyDisk, FilePdf, FileDoc, Upload, DownloadSimple, ArrowLeft, Archive, ArrowsClockwise,
  Copy, PencilSimple, PushPin, PushPinSlash,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { REQ_NAMES, buildRequirementListPath } from "@/lib/requirementNavConfig";
import { Card } from "@/components/ui/card";

const LazyDocxEditorPanel = lazyWithRetry(
  () => import("@/components/documents/DocxEditorPanel"),
);

const DOCX_EDITOR_FALLBACK = (
  <div
    className="flex items-center justify-center min-h-[560px] text-slate-600 text-sm border border-slate-200 rounded-xl bg-white"
    aria-busy="true"
    data-testid="docx-editor-loading"
  >
    A carregar editor Word…
  </div>
);

const DOCX_EDITOR_TEARDOWN = (
  <div
    className="flex items-center justify-center min-h-[560px] text-slate-500 text-sm border border-slate-200 rounded-xl bg-white"
    aria-busy="true"
    data-testid="docx-editor-teardown"
  >
    A sair do editor…
  </div>
);

const SaveAsDialog = ({ doc, onCreated }) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [revision, setRevision] = useState("");
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();

  useEffect(() => {
    if (open && doc) {
      setTitle(`${doc.title} (cópia)`);
      setRevision(doc.version || "1.0");
    }
  }, [open, doc]);

  const save = async () => {
    if (!title.trim()) return toast.error("Informe o título");
    setBusy(true);
    try {
      const { data } = await duplicateDocument(doc.id, {
        title: title.trim(),
        version: revision,
        content_html: doc.content_html,
        code: doc.code,
        responsible: doc.responsible,
        review_date: doc.review_date,
      });
      toast.success("Salvo como nova cópia");
      setOpen(false);
      onCreated?.(data);
      nav(`/document/${data.id}`);
    } catch { toast.error("Falha ao salvar como"); }
    finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" data-testid="save-as-btn">
          <Copy size={16} className="mr-1.5" /> Salvar como
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display">Salvar como nova cópia</DialogTitle>
          <p className="text-sm text-slate-500 mt-1">O documento original não será sobrescrito.</p>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          <div>
            <Label>Novo título *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} data-testid="save-as-title" />
          </div>
          <div>
            <Label>Revisão</Label>
            <Input value={revision} onChange={(e) => setRevision(e.target.value)} data-testid="save-as-revision" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={save} disabled={busy} className="bg-blue-600 hover:bg-blue-700 text-white" data-testid="confirm-save-as">Salvar nova cópia</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const DocumentEditor = () => {
  const { id } = useParams();
  const nav = useNavigate();
  const navigation = useNavigation();
  const [searchParams, setSearchParams] = useSearchParams();
  const suspendHeavyEditor = navigation.state !== "idle"
    && navigation.location
    && !navigation.location.pathname.startsWith("/document/");
  const { user } = useAuth();
  const viewMode = searchParams.get("mode") === "view";
  const [doc, setDoc] = useState(null);
  const [saving, setSaving] = useState(false);
  const [responsibles, setResponsibles] = useState([]);
  const [reloadToken, setReloadToken] = useState(0);
  const [docxDirty, setDocxDirty] = useState(false);
  const [wordDocumentMode, setWordDocumentMode] = useState("editing");
  const [printMode, setPrintMode] = useState(false);
  const docxEditorRef = useRef(null);
  const originalDocxBufferRef = useRef(null);
  const printTimeoutRef = useRef(null);
  const fileInputRef = useRef();

  const load = useCallback(async () => {
    try {
      const data = await getDocument(id);
      setDoc(data);
      if (documentUsesDocxEditor(data)) {
        scheduleDocxEditorPreload();
      }
      if (data?.tenant_id) {
        try {
          setResponsibles(await loadTenantResponsibles(data.tenant_id));
        } catch { setResponsibles([]); }
      }
    }
    catch { toast.error("Documento não encontrado"); nav(-1); }
  }, [id, nav]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!doc?.id) return;
    setDocxDirty(false);
    setWordDocumentMode(viewMode ? "viewing" : "editing");
  }, [doc?.id, reloadToken, viewMode]);

  useEffect(() => () => {
    if (printTimeoutRef.current != null) {
      window.clearTimeout(printTimeoutRef.current);
    }
  }, []);

  const handleOriginalBufferLoaded = useCallback((ab) => {
    originalDocxBufferRef.current = ab ? ab.slice(0) : null;
  }, []);

  const patchDoc = useCallback((field, value) => {
    setDoc((p) => (p ? { ...p, [field]: value } : p));
  }, []);

  const editorDoc = useMemo(() => {
    if (!doc?.id) return null;
    return {
      id: doc.id,
      title: doc.title,
      has_file: doc.has_file,
      file_name: doc.file_name,
      file_mime: doc.file_mime,
      storage_path: doc.storage_path,
      requirement: doc.requirement,
      folder_key: doc.folder_key,
      section: doc.section,
      tenant_id: doc.tenant_id,
    };
  }, [
    doc?.id,
    doc?.title,
    doc?.has_file,
    doc?.file_name,
    doc?.file_mime,
    doc?.storage_path,
    doc?.requirement,
    doc?.folder_key,
    doc?.section,
    doc?.tenant_id,
  ]);

  const metaPatch = () => ({
    title: doc.title,
    code: doc.code,
    version: doc.version,
    responsible: doc.responsible,
    review_date: doc.review_date || null,
    status: doc.status,
    folder_key: doc.folder_key ?? null,
  });

  const save = async () => {
    setSaving(true);
    try {
      const contentHtml = doc.content_html || "";
      const usesDocx = documentUsesDocxEditor(doc);

      if (usesDocx && docxEditorRef?.current) {
        const result = await saveDocxWithFidelity(docxEditorRef, originalDocxBufferRef.current, {
          dirty: docxDirty,
        });

        if (result.skipped) {
          const data = await updateDocument(id, metaPatch(), user?.id);
          setDoc((p) => ({ ...data, content_html: p.content_html }));
          toast.success("Metadados salvos (ficheiro Word inalterado)");
        } else if (result.headerRegression || result.error) {
          toast.error(result.error || "Falha ao preservar cabeçalho Word");
          return;
        } else if (result.buffer?.byteLength) {
          const baseName = (doc.file_name || doc.title || "documento").replace(/\.[^.]+$/, "");
          const file = new File([result.buffer], `${baseName}.docx`, {
            type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          });
          await uploadDocumentFile(id, file, user?.id, null);
          originalDocxBufferRef.current = result.buffer.slice(0);
          setDocxDirty(false);
          const data = await updateDocument(id, metaPatch(), user?.id);
          setDoc((p) => ({ ...data, content_html: p.content_html }));
          setReloadToken((t) => t + 1);
          toast.success("Salvo — cabeçalho Word preservado");
        } else {
          const data = await updateDocument(id, metaPatch(), user?.id);
          setDoc((p) => ({ ...data, content_html: p.content_html }));
          toast.success("Metadados salvos");
        }
      } else {
        const data = await updateDocument(id, { ...metaPatch(), content_html: contentHtml }, user?.id);
        setDoc((p) => ({ ...data, content_html: p.content_html }));
        toast.success("Salvo");
      }
    } catch (err) {
      console.error("[DocumentEditor] save", err);
      toast.error(err?.message || "Falha ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const exportFile = async (format) => {
    try {
      if (format === "pdf" && canEditRich && docxEditorRef?.current?.print) {
        setPrintMode(true);
        await new Promise((r) => window.requestAnimationFrame(r));
        printDocxFromEditor(docxEditorRef);
        if (printTimeoutRef.current != null) {
          window.clearTimeout(printTimeoutRef.current);
        }
        printTimeoutRef.current = window.setTimeout(() => {
          printTimeoutRef.current = null;
          setPrintMode(false);
        }, 2000);
        toast.info(
          "Na janela de impressão, escolha «Guardar como PDF» com fundo branco e margens padrão.",
          { duration: 7000 },
        );
        return;
      }
      if (format === "docx" && canEditRich && doc.has_file && !docxDirty) {
        await downloadOriginal();
        toast.success("Ficheiro Word original descarregado");
        return;
      }
      if (format === "docx" && canEditRich && docxEditorRef?.current) {
        const result = await saveDocxWithFidelity(docxEditorRef, originalDocxBufferRef.current, {
          dirty: docxDirty,
        });
        if (result.skipped && doc.has_file) {
          await downloadOriginal();
          return;
        }
        if (result.buffer?.byteLength) {
          triggerBlobDownload(
            new Blob([result.buffer], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }),
            `${doc.title}.docx`,
          );
          if (docxDirty) {
            toast.info("Exportado com alterações do editor (cabeçalho validado).");
          }
          return;
        }
        if (result.error) {
          toast.error(result.error);
          return;
        }
      }
      const blob = await exportDocumentBlob(id, format);
      triggerBlobDownload(blob, `${doc.title}.${format === "docx" ? "docx" : "pdf"}`);
      if (format === "pdf" && doc.has_file && isDocxFileName(doc.file_name, doc.file_mime)) {
        toast.info(
          "Este PDF foi gerado a partir do texto do documento e pode não incluir o cabeçalho Word. Para fidelidade total, use PDF no editor do documento.",
          { duration: 7000 },
        );
      }
    } catch { toast.error("Falha ao exportar"); }
  };

  const downloadOriginal = async () => {
    try {
      const blob = await downloadOriginalFile(doc);
      triggerBlobDownload(blob, doc.file_name || "arquivo");
    } catch { toast.error("Falha ao baixar"); }
  };

  const uploadFile = async (file) => {
    if (!doc) return;
    if (!isDocxFile(file)) {
      toast.error("O editor Word nativo aceita apenas ficheiros .docx");
      return;
    }
    try {
      const data = await uploadDocumentFile(id, file, user?.id, null);
      setDoc((p) => ({ ...p, ...data }));
      setDocxDirty(false);
      setWordDocumentMode("editing");
      setReloadToken((t) => t + 1);
      toast.success(
        "Documento Word carregado. A formatação original mantém-se até editar e salvar.",
        { duration: 5000 },
      );
    } catch (err) {
      console.error("[DocumentEditor] upload", err);
      toast.error(err?.message || "Falha no upload");
    }
  };

  const toggleStatus = async () => {
    const newStatus = doc.status === "vigente" ? "obsoleto" : "vigente";
    try {
      const data = await updateDocument(id, { status: newStatus }, user?.id);
      setDoc((p) => ({ ...data, content_html: p.content_html }));
      toast.success(newStatus === "obsoleto" ? "Movido para Obsoletos" : "Reativado");
    } catch { toast.error("Falha ao atualizar"); }
  };

  const togglePin = async () => {
    const next = !doc.pinned_at;
    try {
      const data = await togglePinApi(id, next, user?.id);
      setDoc((p) => ({ ...data, content_html: p.content_html }));
      toast.success(next ? "Marcado na dashboard" : "Removido da dashboard");
    } catch { toast.error("Falha ao atualizar pin"); }
  };

  const canEditRich = documentUsesDocxEditor(doc);
  const readOnly = viewMode || !canEditRich;
  const authorName = user?.name || user?.email || "Utilizador";

  const activeWordMode = readOnly ? "viewing" : wordDocumentMode;

  const editorPanelProps = useMemo(() => {
    if (!editorDoc) return null;
    return {
      doc: editorDoc,
      readOnly,
      documentMode: activeWordMode,
      printMode,
      author: authorName,
      reloadToken,
      editorRef: docxEditorRef,
      onDirtyChange: setDocxDirty,
      onOriginalBufferLoaded: handleOriginalBufferLoaded,
    };
  }, [editorDoc, readOnly, activeWordMode, printMode, authorName, reloadToken, handleOriginalBufferLoaded]);

  if (!doc) return <div className="text-slate-600">Carregando documento…</div>;

  return (
    <div className="space-y-6 min-w-0" data-testid="document-editor">
      <div className="flex items-start justify-between gap-3 flex-wrap min-w-0">
        <div className="min-w-0 flex-1 basis-full sm:basis-auto">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <Link to={buildRequirementListPath(doc.requirement, doc.folder_key)} className="hover:text-blue-600 inline-flex items-center gap-1"><ArrowLeft size={12} /> Voltar para {doc.requirement}. {REQ_NAMES[String(doc.requirement)]}</Link>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold break-words tracking-tight text-slate-900 mt-1">{doc.title || "Sem título"}</h1>
          <div className="text-sm text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
            <span className="font-mono">Emissão: {doc.code || "—"}</span>
            <span>•</span>
            <span>Rev. {doc.version || "—"}</span>
            <span>•</span>
            <span>{doc.section}</span>
            <span>•</span>
            <Badge className={doc.status === "vigente" ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" : "bg-red-100 text-red-700 hover:bg-red-100"}>{doc.status}</Badge>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto min-w-0">
          {readOnly && canEditRich && (
            <Button
              variant="outline"
              onClick={() => {
                setSearchParams({});
                setWordDocumentMode("editing");
              }}
            >
              <PencilSimple size={16} className="mr-1.5" /> Editar
            </Button>
          )}
          {!readOnly && canEditRich && (
            <input ref={fileInputRef} type="file" hidden accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                   onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0])} />
          )}
          {!readOnly && canEditRich && (
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            data-testid="upload-file-btn"
            title="Carregar ou substituir ficheiro .docx no editor"
          >
            <Upload size={16} className="mr-1.5" /> {doc.has_file ? "Substituir Word" : "Carregar Word"}
          </Button>
          )}
          {doc.has_file && (
            <Button variant="outline" onClick={downloadOriginal} data-testid="download-original-btn" title="Ficheiro intacto do Storage">
              <DownloadSimple size={16} className="mr-1.5" /> Baixar original
            </Button>
          )}
          <Button variant="outline" onClick={() => exportFile("pdf")} data-testid="export-pdf-btn" title="Impressão do editor (PDF fiel)">
            <FilePdf size={16} className="mr-1.5" /> PDF
          </Button>
          <Button variant="outline" onClick={() => exportFile("docx")} data-testid="export-docx-btn" title={docxDirty ? "Exportar versão editada" : "Descarrega original se não houve edição"}>
            <FileDoc size={16} className="mr-1.5" /> {docxDirty ? "Word (editado)" : "Word"}
          </Button>
          <Button
            variant="outline"
            onClick={togglePin}
            data-testid="toggle-pin-btn"
            className={doc.pinned_at ? "border-amber-300 bg-amber-50 text-amber-800" : ""}
          >
            {doc.pinned_at ? (
              <><PushPinSlash size={16} className="mr-1.5" /> Remover da dashboard</>
            ) : (
              <><PushPin size={16} className="mr-1.5" /> Marcar na dashboard</>
            )}
          </Button>
          <Button variant="outline" onClick={toggleStatus} data-testid="toggle-status-btn">
            {doc.status === "vigente" ? <><Archive size={16} className="mr-1.5" /> Obsoleto</> : <><ArrowsClockwise size={16} className="mr-1.5" /> Reativar</>}
          </Button>
          {!readOnly && <SaveAsDialog doc={doc} />}
          {!readOnly && (
          <Button onClick={save} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white" data-testid="save-doc-btn">
            <FloppyDisk size={16} className="mr-1.5" /> {saving ? "Salvando…" : "Salvar"}
          </Button>
          )}
        </div>
      </div>

      <div className="space-y-6">
        <DocumentEditorMetaCard
          title={doc.title}
          version={doc.version}
          code={doc.code}
          responsible={doc.responsible}
          reviewDate={doc.review_date}
          readOnly={readOnly}
          hasFile={doc.has_file}
          fileName={doc.file_name}
          docxDirty={docxDirty}
          responsibles={responsibles}
          onPatch={patchDoc}
        />

        <div className="w-full min-w-0">
          {canEditRich && editorPanelProps ? (
            suspendHeavyEditor ? (
              DOCX_EDITOR_TEARDOWN
            ) : (
              <EditorErrorBoundary resetKey={`${editorDoc?.id}-${reloadToken}`}>
                <Suspense fallback={DOCX_EDITOR_FALLBACK}>
                  <LazyDocxEditorPanel {...editorPanelProps} />
                </Suspense>
              </EditorErrorBoundary>
            )
          ) : readOnly && doc.content_html ? (
            <Card className="border-slate-200 p-6 prose prose-slate max-w-none min-h-[320px]"
              dangerouslySetInnerHTML={{ __html: doc.content_html || "<p class='text-slate-500'>Sem conteúdo.</p>" }}
            />
          ) : (
            <p className="text-sm text-slate-600">Este tipo de documento usa apenas ficheiro anexo — utilize download na lista.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentEditor;
