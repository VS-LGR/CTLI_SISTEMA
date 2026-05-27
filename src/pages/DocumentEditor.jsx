import React, { useCallback, useEffect, useState, useRef, lazy, Suspense, useMemo } from "react";
import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import api, { asArray } from "@/lib/api";
import { saveDocxFromEditor } from "@/lib/docxEditorSave";
import { documentUsesDocxEditor, scheduleDocxEditorPreload } from "@/lib/preloadDocxEditor";
import {
  getDocument, updateDocument, uploadDocumentFile, exportDocumentBlob,
  downloadOriginalFile, duplicateDocument, toggleDocumentPin as togglePinApi,
} from "@/lib/documentsApi";
import { triggerBlobDownload } from "@/lib/documentExport";
import { isDocxFile, tryConvertDocxToHtml } from "@/lib/docxImport";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  FloppyDisk, FilePdf, FileDoc, Upload, DownloadSimple, ArrowLeft, Archive, ArrowsClockwise,
  Copy, Eye, PencilSimple, PushPin, PushPinSlash,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { RESPONSIBLE_ROLES } from "@/lib/roles";
import { REQ_NAMES, buildRequirementListPath } from "@/lib/requirementNavConfig";

const LazyDocxEditorPanel = lazy(() => import("@/components/documents/DocxEditorPanel"));

const DOCX_EDITOR_FALLBACK = (
  <div
    className="flex items-center justify-center min-h-[560px] text-slate-600 text-sm border border-slate-200 rounded-xl bg-white"
    aria-busy="true"
    data-testid="docx-editor-loading"
  >
    A carregar editor Word…
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
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const viewMode = searchParams.get("mode") === "view";
  const [doc, setDoc] = useState(null);
  const [saving, setSaving] = useState(false);
  const [responsibles, setResponsibles] = useState([]);
  const [reloadToken, setReloadToken] = useState(0);
  const docxEditorRef = useRef(null);
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
          const r = await api.get(`/tenants/${data.tenant_id}/responsibles`);
          setResponsibles(asArray(r.data));
        } catch { setResponsibles([]); }
      }
    }
    catch { toast.error("Documento não encontrado"); nav(-1); }
  }, [id, nav]);

  useEffect(() => {
    load();
  }, [load]);

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
      let contentHtml = doc.content_html || "";
      const usesDocx = documentUsesDocxEditor(doc);

      if (usesDocx && docxEditorRef?.current) {
        const buf = await saveDocxFromEditor(docxEditorRef);
        if (buf?.byteLength) {
          const baseName = (doc.file_name || doc.title || "documento").replace(/\.[^.]+$/, "");
          const file = new File([buf], `${baseName}.docx`, {
            type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          });
          try {
            const conv = await tryConvertDocxToHtml(file);
            if (conv.imported && conv.html) contentHtml = conv.html;
          } catch { /* preview PDF opcional */ }
          await uploadDocumentFile(id, file, user?.id, contentHtml);
          const data = await updateDocument(id, { ...metaPatch(), content_html: contentHtml }, user?.id);
          setDoc((p) => ({ ...data, content_html: contentHtml || p.content_html }));
          setReloadToken((t) => t + 1);
        } else {
          const data = await updateDocument(id, { ...metaPatch(), content_html: contentHtml }, user?.id);
          setDoc((p) => ({ ...data, content_html: contentHtml || p.content_html }));
        }
      } else {
        const data = await updateDocument(id, { ...metaPatch(), content_html: contentHtml }, user?.id);
        setDoc((p) => ({ ...data, content_html: p.content_html }));
      }
      toast.success("Salvo");
    } catch (err) {
      console.error("[DocumentEditor] save", err);
      toast.error(err?.message || "Falha ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const exportFile = async (format) => {
    try {
      if (format === "docx" && docxEditorRef?.current) {
        const buf = await saveDocxFromEditor(docxEditorRef);
        if (buf?.byteLength) {
          triggerBlobDownload(
            new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }),
            `${doc.title}.docx`,
          );
          return;
        }
      }
      const blob = await exportDocumentBlob(id, format);
      triggerBlobDownload(blob, `${doc.title}.${format === "docx" ? "docx" : "pdf"}`);
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
      setReloadToken((t) => t + 1);
      toast.success("Documento Word carregado no editor");
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

  const editorPanelProps = useMemo(() => {
    if (!doc) return null;
    return {
      doc,
      readOnly,
      author: authorName,
      reloadToken,
      editorRef: docxEditorRef,
    };
  }, [doc, readOnly, authorName, reloadToken]);

  if (!doc) return <div className="text-slate-600">Carregando documento…</div>;

  return (
    <div className="space-y-6" data-testid="document-editor">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
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

        <div className="flex items-center gap-2 flex-wrap">
          {readOnly && canEditRich && (
            <Button variant="outline" onClick={() => setSearchParams({})}>
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
          {doc.has_file && <Button variant="outline" onClick={downloadOriginal} data-testid="download-original-btn"><DownloadSimple size={16} className="mr-1.5" /> Baixar original</Button>}
          <Button variant="outline" onClick={() => exportFile("pdf")} data-testid="export-pdf-btn"><FilePdf size={16} className="mr-1.5" /> PDF</Button>
          <Button variant="outline" onClick={() => exportFile("docx")} data-testid="export-docx-btn"><FileDoc size={16} className="mr-1.5" /> Word</Button>
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
        <Card className="border-slate-200">
          <CardContent className="p-5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
            <div className="min-w-0">
              <Label className="text-xs uppercase tracking-wider text-slate-500">Título</Label>
              <Input className="mt-1" value={doc.title} readOnly={readOnly} disabled={readOnly} onChange={(e) => setDoc({ ...doc, title: e.target.value })} data-testid="edit-title" />
            </div>
            <div className="min-w-0">
              <Label className="text-xs uppercase tracking-wider text-slate-500">Revisão</Label>
              <Input className="mt-1" value={doc.version || ""} readOnly={readOnly} disabled={readOnly} onChange={(e) => setDoc({ ...doc, version: e.target.value })} placeholder="Rev. 01" data-testid="edit-revision" />
            </div>
            <div className="min-w-0">
              <Label className="text-xs uppercase tracking-wider text-slate-500">Emissão</Label>
              <Input className="mt-1" type="date" value={doc.code || ""} readOnly={readOnly} disabled={readOnly} onChange={(e) => setDoc({ ...doc, code: e.target.value })} data-testid="edit-emission" />
            </div>
            <div className="min-w-0">
              <Label className="text-xs uppercase tracking-wider text-slate-500">Responsável</Label>
              <select
                value={doc.responsible || ""}
                disabled={readOnly}
                onChange={(e) => setDoc({ ...doc, responsible: e.target.value })}
                className="w-full border border-slate-200 rounded-md h-10 px-3 mt-1 text-sm bg-white disabled:opacity-60"
                data-testid="edit-responsible"
              >
                <option value="">Selecione…</option>
                {responsibles.map((r) => (
                  <option key={r.id} value={r.name}>
                    {r.name} — {RESPONSIBLE_ROLES.find(x => x.value === r.role)?.short}
                  </option>
                ))}
                {doc.responsible && !responsibles.some((r) => r.name === doc.responsible) && (
                  <option value={doc.responsible}>{doc.responsible} (não cadastrado)</option>
                )}
              </select>
            </div>
            <div className="min-w-0">
              <Label className="text-xs uppercase tracking-wider text-slate-500">Próxima revisão</Label>
              <Input className="mt-1" type="date" value={doc.review_date || ""} readOnly={readOnly} disabled={readOnly} onChange={(e) => setDoc({ ...doc, review_date: e.target.value })} data-testid="edit-review-date" />
            </div>
            {doc.has_file && (
              <div className="text-xs bg-slate-50 border border-slate-200 rounded-md p-3 sm:col-span-2 xl:col-span-5 min-w-0">
                <div className="font-semibold text-slate-700 mb-1">Ficheiro Word</div>
                <div className="text-slate-600 truncate" title={doc.file_name}>{doc.file_name}</div>
                <div className="text-[11px] text-slate-500 mt-1">Edição nativa .docx (docx-editor). O ficheiro no Storage é atualizado ao salvar.</div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="w-full min-w-0">
          {canEditRich && editorPanelProps ? (
            <Suspense fallback={DOCX_EDITOR_FALLBACK}>
              <LazyDocxEditorPanel {...editorPanelProps} />
            </Suspense>
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
