import React, { useCallback, useEffect, useState, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import api, { asArray } from "@/lib/api";
import RichEditor from "@/components/RichEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { FloppyDisk, FilePdf, FileDoc, Upload, DownloadSimple, ArrowLeft, Archive, ArrowsClockwise, Copy, Eye, PencilSimple } from "@phosphor-icons/react";
import { toast } from "sonner";
import { RESPONSIBLE_ROLES } from "@/lib/roles";
import { REQ_NAMES, buildRequirementListPath } from "@/lib/requirementNavConfig";

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
      const { data } = await api.post(`/documents/${doc.id}/duplicate`, {
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
  const [doc, setDoc] = useState(null);
  const [saving, setSaving] = useState(false);
  const [responsibles, setResponsibles] = useState([]);
  const fileInputRef = useRef();

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/documents/${id}`);
      setDoc(data);
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

  const save = async () => {
    setSaving(true);
    try {
      const { data } = await api.put(`/documents/${id}`, {
        title: doc.title, code: doc.code, version: doc.version,
        responsible: doc.responsible, review_date: doc.review_date || null,
        content_html: doc.content_html, status: doc.status,
        folder_key: doc.folder_key ?? null,
      });
      setDoc((p) => ({ ...data, content_html: p.content_html }));
      toast.success("Salvo");
    } catch { toast.error("Falha ao salvar"); }
    finally { setSaving(false); }
  };

  const exportFile = async (format) => {
    try {
      const res = await api.get(`/documents/${id}/export?format=${format}`, { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${doc.title}.${format === "docx" ? "docx" : "pdf"}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error("Falha ao exportar"); }
  };

  const downloadOriginal = async () => {
    const res = await api.get(`/documents/${id}/download`, { responseType: "blob" });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement("a"); a.href = url; a.download = doc.file_name || "arquivo"; a.click();
    URL.revokeObjectURL(url);
  };

  const uploadFile = async (file) => {
    const fd = new FormData(); fd.append("file", file);
    try {
      const { data } = await api.post(`/documents/${id}/upload`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      setDoc(data);
      toast.success(file.name.toLowerCase().endsWith(".docx")
        ? "Word carregado e conteúdo importado no editor"
        : "Arquivo anexado");
    } catch { toast.error("Falha no upload"); }
  };

  const toggleStatus = async () => {
    const newStatus = doc.status === "vigente" ? "obsoleto" : "vigente";
    try {
      const { data } = await api.put(`/documents/${id}`, { status: newStatus });
      setDoc((p) => ({ ...data, content_html: p.content_html }));
      toast.success(newStatus === "obsoleto" ? "Movido para Obsoletos" : "Reativado");
    } catch { toast.error("Falha ao atualizar"); }
  };

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
          <input ref={fileInputRef} type="file" hidden accept=".doc,.docx,.pdf,.txt,.rtf,.odt"
                 onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0])} />
          <Button variant="outline" onClick={() => fileInputRef.current?.click()} data-testid="upload-file-btn">
            <Upload size={16} className="mr-1.5" /> {doc.has_file ? "Substituir arquivo" : "Carregar Word/PDF"}
          </Button>
          {doc.has_file && <Button variant="outline" onClick={downloadOriginal} data-testid="download-original-btn"><DownloadSimple size={16} className="mr-1.5" /> Baixar original</Button>}
          <Button variant="outline" onClick={() => exportFile("pdf")} data-testid="export-pdf-btn"><FilePdf size={16} className="mr-1.5" /> PDF</Button>
          <Button variant="outline" onClick={() => exportFile("docx")} data-testid="export-docx-btn"><FileDoc size={16} className="mr-1.5" /> Word</Button>
          <Button variant="outline" onClick={toggleStatus} data-testid="toggle-status-btn">
            {doc.status === "vigente" ? <><Archive size={16} className="mr-1.5" /> Obsoleto</> : <><ArrowsClockwise size={16} className="mr-1.5" /> Reativar</>}
          </Button>
          <SaveAsDialog doc={doc} />
          <Button onClick={save} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white" data-testid="save-doc-btn">
            <FloppyDisk size={16} className="mr-1.5" /> {saving ? "Salvando…" : "Salvar"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="lg:col-span-1 border-slate-200 h-fit">
          <CardContent className="p-5 space-y-4">
            <div>
              <Label className="text-xs uppercase tracking-wider text-slate-500">Título</Label>
              <Input className="mt-1" value={doc.title} onChange={(e) => setDoc({ ...doc, title: e.target.value })} data-testid="edit-title" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-slate-500">Revisão</Label>
              <Input className="mt-1" value={doc.version || ""} onChange={(e) => setDoc({ ...doc, version: e.target.value })} placeholder="Rev. 01" data-testid="edit-revision" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-slate-500">Emissão</Label>
              <Input className="mt-1" type="date" value={doc.code || ""} onChange={(e) => setDoc({ ...doc, code: e.target.value })} data-testid="edit-emission" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-slate-500">Responsável</Label>
              <select
                value={doc.responsible || ""}
                onChange={(e) => setDoc({ ...doc, responsible: e.target.value })}
                className="w-full border border-slate-200 rounded-md h-10 px-3 mt-1 text-sm bg-white"
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
            <div>
              <Label className="text-xs uppercase tracking-wider text-slate-500">Próxima revisão</Label>
              <Input className="mt-1" type="date" value={doc.review_date || ""} onChange={(e) => setDoc({ ...doc, review_date: e.target.value })} data-testid="edit-review-date" />
            </div>
            {doc.has_file && (
              <div className="text-xs bg-slate-50 border border-slate-200 rounded-md p-3">
                <div className="font-semibold text-slate-700 mb-1">Arquivo original</div>
                <div className="text-slate-600 truncate" title={doc.file_name}>{doc.file_name}</div>
                <div className="text-[11px] text-slate-500 mt-1">O original é preservado. As edições no editor são salvas separadamente.</div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="lg:col-span-3">
          <RichEditor
            value={doc.content_html}
            onChange={(html) => setDoc((p) => ({ ...p, content_html: html }))}
          />
        </div>
      </div>
    </div>
  );
};

export default DocumentEditor;
