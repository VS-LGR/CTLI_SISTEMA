import React, { Suspense, lazy, useCallback, useEffect, useState } from "react";
import { useParams, useNavigate, useOutletContext, Link, Navigate } from "react-router-dom";
import api from "@/lib/api";
import { RESPONSIBLE_ROLES } from "@/lib/roles";
import {
  REQ_NAMES,
  requiresFolderNav,
  getFirstFolderKey,
  isValidFolderKey,
  getFolderLabel,
} from "@/lib/requirementNavConfig";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, DownloadSimple, FileText, FilePdf, FileDoc, ArrowsClockwise, Trash, PencilSimple, Upload, Archive } from "@phosphor-icons/react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { COLETA_REQ_ID, COLETA_FOLDER_KEY } from "@/lib/coletaRoutes";

const ColetaPage = lazy(() => import("@/pages/ColetaPage"));
import { canAccessColeta } from "@/lib/roles";
import { useAuth } from "@/context/AuthContext";

const CreateDocDialog = ({ tenantId, requirement, folderKey, section, onCreated }) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [emission, setEmission] = useState("");
  const [revision, setRevision] = useState("1.0");
  const [responsible, setResponsible] = useState("");
  const [reviewDate, setReviewDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [responsibles, setResponsibles] = useState([]);

  useEffect(() => {
    if (!open || !tenantId) return;
    api.get(`/tenants/${tenantId}/responsibles`).then((r) => setResponsibles(r.data)).catch(() => setResponsibles([]));
  }, [open, tenantId]);

  const save = async () => {
    if (!title.trim()) return toast.error("Informe o título");
    setBusy(true);
    try {
      const body = {
        tenant_id: tenantId, requirement, section,
        title: title.trim(), code: emission, version: revision, responsible,
        review_date: reviewDate || null,
        content_html: "", status: "vigente",
      };
      if (requiresFolderNav(requirement) && folderKey) body.folder_key = folderKey;
      const { data } = await api.post("/documents", body);
      toast.success("Documento criado");
      setOpen(false);
      setTitle(""); setEmission(""); setRevision("1.0"); setResponsible(""); setReviewDate("");
      onCreated?.(data);
    } catch (e) {
      toast.error("Falha ao criar");
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white" data-testid="create-doc-btn">
          <Plus size={16} className="mr-1.5" /> Novo {section === "procedimento" ? "Procedimento" : "Registro"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display">Novo {section}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Título *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} data-testid="doc-title-input" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Revisão</Label>
              <Input value={revision} onChange={(e) => setRevision(e.target.value)} placeholder="Rev. 01" data-testid="doc-revision-input" />
            </div>
            <div>
              <Label>Emissão</Label>
              <Input type="date" value={emission} onChange={(e) => setEmission(e.target.value)} data-testid="doc-emission-input" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Responsável</Label>
              <select
                value={responsible}
                onChange={(e) => setResponsible(e.target.value)}
                className="w-full border border-slate-200 rounded-md h-10 px-3 mt-1 text-sm bg-white"
                data-testid="doc-responsible-select"
              >
                <option value="">Selecione…</option>
                {responsibles.map((r) => (
                  <option key={r.id} value={r.name}>{r.name} — {RESPONSIBLE_ROLES.find(x => x.value === r.role)?.short}</option>
                ))}
              </select>
              {responsibles.length === 0 && (
                <div className="text-[11px] text-amber-700 mt-1">Cadastre responsáveis na página Clientes.</div>
              )}
            </div>
            <div>
              <Label>Próxima revisão</Label>
              <Input type="date" value={reviewDate} onChange={(e) => setReviewDate(e.target.value)} data-testid="doc-review-input" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={save} disabled={busy} className="bg-blue-600 hover:bg-blue-700 text-white" data-testid="confirm-create-doc">Criar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const DocRow = ({ doc, onUpdate, onDelete }) => {
  const fileInputRef = React.useRef();
  const [busy, setBusy] = useState(false);

  const downloadExport = async (format) => {
    try {
      const res = await api.get(`/documents/${doc.id}/export?format=${format}`, { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${doc.title}.${format === "docx" ? "docx" : "pdf"}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error("Falha ao exportar"); }
  };

  const downloadOriginal = async () => {
    try {
      const res = await api.get(`/documents/${doc.id}/download`, { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.file_name || "arquivo";
      a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error("Falha ao baixar"); }
  };

  const uploadFile = async (file) => {
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post(`/documents/${doc.id}/upload`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Arquivo anexado");
      onUpdate?.(data);
    } catch { toast.error("Falha no upload"); }
    finally { setBusy(false); }
  };

  const toggleStatus = async () => {
    const newStatus = doc.status === "vigente" ? "obsoleto" : "vigente";
    try {
      const { data } = await api.put(`/documents/${doc.id}`, { status: newStatus });
      toast.success(newStatus === "obsoleto" ? "Movido para Obsoletos" : "Marcado como Vigente");
      onUpdate?.(data);
    } catch { toast.error("Falha ao atualizar"); }
  };

  const deleteDoc = async () => {
    if (!window.confirm("Excluir este documento permanentemente?")) return;
    try {
      await api.delete(`/documents/${doc.id}`);
      toast.success("Excluído");
      onDelete?.(doc.id);
    } catch { toast.error("Falha ao excluir"); }
  };

  return (
    <tr className="hover:bg-slate-50 transition" data-testid={`doc-row-${doc.id}`}>
      <td className="px-4 py-3">
        <Link to={`/document/${doc.id}`} className="font-medium text-sm text-slate-900 hover:text-blue-600">{doc.title}</Link>
        <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
          {doc.code && <span className="font-mono">Emissão: {doc.code}</span>}
          <span>Rev. {doc.version}</span>
          {doc.has_file && <Badge variant="outline" className="text-[10px] py-0">arquivo anexo</Badge>}
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-slate-600">{doc.responsible || "—"}</td>
      <td className="px-4 py-3 text-sm text-slate-600">{doc.review_date || "—"}</td>
      <td className="px-4 py-3">
        <Badge className={doc.status === "vigente" ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" : "bg-red-100 text-red-700 hover:bg-red-100"}>
          {doc.status}
        </Badge>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1 justify-end">
          <input ref={fileInputRef} type="file" hidden onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0])} />
          <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()} disabled={busy} title="Upload de arquivo" data-testid={`upload-${doc.id}`}>
            <Upload size={16} />
          </Button>
          {doc.has_file && (
            <Button variant="ghost" size="sm" onClick={downloadOriginal} title="Baixar arquivo original" data-testid={`download-orig-${doc.id}`}>
              <DownloadSimple size={16} />
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => downloadExport("pdf")} title="Exportar PDF" data-testid={`export-pdf-${doc.id}`}>
            <FilePdf size={16} />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => downloadExport("docx")} title="Exportar Word" data-testid={`export-docx-${doc.id}`}>
            <FileDoc size={16} />
          </Button>
          <Link to={`/document/${doc.id}`}><Button variant="ghost" size="sm" title="Editar"><PencilSimple size={16} /></Button></Link>
          <Button variant="ghost" size="sm" onClick={toggleStatus} title={doc.status === "vigente" ? "Mover para obsoletos" : "Reativar"} data-testid={`toggle-status-${doc.id}`}>
            {doc.status === "vigente" ? <Archive size={16} /> : <ArrowsClockwise size={16} />}
          </Button>
          <Button variant="ghost" size="sm" onClick={deleteDoc} title="Excluir" className="text-red-600 hover:text-red-700">
            <Trash size={16} />
          </Button>
        </div>
      </td>
    </tr>
  );
};

const DocTable = ({ docs, onUpdate, onDelete }) => (
  <Card className="border-slate-200 overflow-hidden">
    <div className="overflow-x-auto -mx-px">
    <table className="w-full text-sm min-w-[640px]">
      <thead className="bg-slate-50 border-b border-slate-200">
        <tr className="text-left text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
          <th className="px-4 py-3">Documento</th>
          <th className="px-4 py-3">Responsável</th>
          <th className="px-4 py-3">Próx. revisão</th>
          <th className="px-4 py-3">Status</th>
          <th className="px-4 py-3 text-right">Ações</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100 bg-white">
        {docs.length === 0 && (
          <tr><td colSpan={5} className="px-4 py-12 text-center text-sm text-slate-500">
            <FileText size={32} className="mx-auto text-slate-300 mb-2" />
            Nenhum documento aqui ainda.
          </td></tr>
        )}
        {docs.map((d) => <DocRow key={d.id} doc={d} onUpdate={onUpdate} onDelete={onDelete} />)}
      </tbody>
    </table>
    </div>
  </Card>
);

const RequirementView = () => {
  const { id, folderKey } = useParams();
  const { user } = useAuth();
  const { currentTenantId, currentTenant } = useOutletContext();
  const [section, setSection] = useState("procedimento");
  const [status, setStatus] = useState("vigente");
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);

  const first = getFirstFolderKey(id);

  const load = useCallback(async () => {
    if (!currentTenantId) { setLoading(false); return; }
    setLoading(true);
    try {
      const params = { tenant_id: currentTenantId, requirement: id, section, status };
      if (requiresFolderNav(id) && folderKey) params.folder_key = folderKey;
      const { data } = await api.get("/documents", { params });
      setDocs(data);
    } catch { setDocs([]); }
    finally { setLoading(false); }
  }, [currentTenantId, id, folderKey, section, status]);

  useEffect(() => {
    load();
  }, [load]);

  if (requiresFolderNav(id) && !folderKey && !first) {
    return <div className="text-slate-600">Nenhuma subsessão configurada para este requisito.</div>;
  }
  if (requiresFolderNav(id) && !folderKey && first) {
    return <Navigate to={`/requirement/${id}/${first}`} replace />;
  }
  if (requiresFolderNav(id) && folderKey && !isValidFolderKey(id, folderKey) && first) {
    return <Navigate to={`/requirement/${id}/${first}`} replace />;
  }
  if (!requiresFolderNav(id) && folderKey) {
    return <Navigate to={`/requirement/${id}`} replace />;
  }

  if (!currentTenantId) {
    return <div className="text-slate-600">Selecione um cliente.</div>;
  }

  const folderLabel = folderKey ? getFolderLabel(id, folderKey) : null;
  const reqTitle = REQ_NAMES[String(id)];
  const isColetaRegistro =
    String(id) === COLETA_REQ_ID
    && folderKey === COLETA_FOLDER_KEY
    && section === "registro"
    && canAccessColeta(user?.role);

  const updateDoc = (d) => setDocs((prev) => prev.map((x) => x.id === d.id ? d : x).filter((x) => x.status === status));
  const removeDoc = (idd) => setDocs((prev) => prev.filter((x) => x.id !== idd));
  const onCreated = (d) => {
    const fk = requiresFolderNav(id) ? folderKey : null;
    const folderOk = !fk || d.folder_key === fk;
    if (d.status === status && d.section === section && folderOk) setDocs((p) => [d, ...p]);
  };

  return (
    <div className="space-y-6" data-testid={`req-view-${id}`}>
      <div>
        <div className="text-xs text-slate-500 flex items-center gap-1.5 flex-wrap">
          <Link to="/dashboard" className="hover:text-blue-600">Início</Link>
          <span>/</span>
          <span>Requisitos</span>
          <span>/</span>
          <span className="text-slate-700 font-medium">{id}. {reqTitle}</span>
          {folderLabel && (
            <>
              <span>/</span>
              <span className="text-slate-700 font-medium max-w-[min(100%,28rem)] truncate" title={folderLabel}>{folderLabel}</span>
            </>
          )}
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mt-2 break-words">
          <span className="font-mono text-slate-400 mr-2">{id}.</span>{reqTitle}
        </h1>
        {folderLabel && (
          <p className="text-sm text-slate-700 mt-1 font-medium">{folderLabel}</p>
        )}
        <p className="text-sm text-slate-600 mt-1">Ambiente: <span className="font-medium text-slate-800">{currentTenant?.name}</span></p>
      </div>

      <Tabs value={section} onValueChange={setSection}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <TabsList className="bg-white border border-slate-200">
            <TabsTrigger value="procedimento" data-testid="tab-procedimentos">Procedimentos</TabsTrigger>
            <TabsTrigger value="registro" data-testid="tab-registros">Registros</TabsTrigger>
          </TabsList>

          {!isColetaRegistro && (
            <div className="flex items-center gap-2">
              <Tabs value={status} onValueChange={setStatus}>
                <TabsList className="bg-white border border-slate-200">
                  <TabsTrigger value="vigente" data-testid="tab-vigentes">Vigentes</TabsTrigger>
                  <TabsTrigger value="obsoleto" data-testid="tab-obsoletos">Obsoletos</TabsTrigger>
                </TabsList>
              </Tabs>
              <CreateDocDialog tenantId={currentTenantId} requirement={id} folderKey={folderKey} section={section} onCreated={onCreated} />
            </div>
          )}
        </div>

        <TabsContent value={section} className="mt-4">
          {isColetaRegistro ? (
            <Suspense fallback={<div className="text-slate-600 text-sm py-8 text-center">A carregar coleta…</div>}>
              <ColetaPage embedded />
            </Suspense>
          ) : loading ? (
            <div className="text-slate-600">Carregando…</div>
          ) : (
            <DocTable docs={docs} onUpdate={updateDoc} onDelete={removeDoc} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RequirementView;
