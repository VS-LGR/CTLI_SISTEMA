import React, { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  Plus, Upload, DownloadSimple, FilePdf, Trash, Eye, Archive, ArrowsClockwise,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import {
  createDocument, deleteDocument, updateDocument, uploadDocumentFile,
  exportDocumentBlob, downloadOriginalFile,
} from "@/lib/documentsApi";
import { triggerBlobDownload } from "@/lib/documentExport";
import ConfirmDeleteDialog from "@/components/documents/ConfirmDeleteDialog";
import { useAuth } from "@/context/AuthContext";

function DocFileRow({ doc, variant, onUpdate, onDelete }) {
  const { user } = useAuth();
  const fileRef = useRef();
  const [busy, setBusy] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const isVigente = variant === "vigente";

  const download = async () => {
    try {
      if (doc.has_file) {
        const blob = await downloadOriginalFile(doc);
        triggerBlobDownload(blob, doc.file_name || doc.title);
      } else {
        const blob = await exportDocumentBlob(doc.id, "pdf");
        triggerBlobDownload(blob, `${doc.title}.pdf`);
      }
    } catch {
      toast.error("Falha no download");
    }
  };

  const upload = async (file) => {
    setBusy(true);
    try {
      const updated = await uploadDocumentFile(doc.id, file, user?.id, null);
      toast.success("Ficheiro atualizado");
      onUpdate?.(updated);
    } catch {
      toast.error("Falha no upload");
    } finally {
      setBusy(false);
    }
  };

  const toggleStatus = async () => {
    const newStatus = doc.status === "vigente" ? "obsoleto" : "vigente";
    try {
      const updated = await updateDocument(doc.id, { status: newStatus }, user?.id);
      toast.success(newStatus === "obsoleto" ? "Movido para obsoletos" : "Reativado");
      onUpdate?.(updated);
    } catch {
      toast.error("Falha ao atualizar");
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await deleteDocument(doc.id);
      toast.success("Excluído");
      setDeleteOpen(false);
      onDelete?.(doc.id);
    } catch {
      toast.error("Falha ao excluir");
    } finally {
      setBusy(false);
    }
  };

  return (
    <tr className="hover:bg-slate-50">
      <td className="px-4 py-3">
        <span className="font-medium text-sm">{doc.title}</span>
        <div className="text-xs text-slate-500">Rev. {doc.version} {doc.has_file && <Badge variant="outline" className="ml-1 text-[10px]">ficheiro</Badge>}</div>
      </td>
      <td className="px-4 py-3 text-sm">{doc.responsible || "—"}</td>
      <td className="px-4 py-3 text-sm">{doc.review_date || "—"}</td>
      <td className="px-4 py-3">
        <div className="flex gap-1 justify-end flex-wrap">
          <input ref={fileRef} type="file" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
          {isVigente && (
            <Button variant="ghost" size="sm" title="Upload" disabled={busy} onClick={() => fileRef.current?.click()}>
              <Upload size={16} />
            </Button>
          )}
          <Button variant="ghost" size="sm" title="Download" onClick={download}><DownloadSimple size={16} /></Button>
          {isVigente && (
            <>
              <Button variant="ghost" size="sm" title="PDF" onClick={async () => {
                try {
                  const blob = await exportDocumentBlob(doc.id, "pdf");
                  triggerBlobDownload(blob, `${doc.title}.pdf`);
                } catch { toast.error("Falha PDF"); }
              }}><FilePdf size={16} /></Button>
              <Button variant="ghost" size="sm" title="Obsoleto" onClick={toggleStatus}><Archive size={16} /></Button>
            </>
          )}
          {!isVigente && (
            <Button variant="ghost" size="sm" title="Reativar" onClick={toggleStatus}><ArrowsClockwise size={16} /></Button>
          )}
          <Link to={`/document/${doc.id}?mode=view`}><Button variant="ghost" size="sm" title="Visualizar"><Eye size={16} /></Button></Link>
          <Button variant="ghost" size="sm" className="text-red-600" title="Excluir" onClick={() => setDeleteOpen(true)}><Trash size={16} /></Button>
        </div>
      </td>
      <ConfirmDeleteDialog open={deleteOpen} onOpenChange={setDeleteOpen} onConfirm={remove} busy={busy} />
    </tr>
  );
}

export default function DocumentosOnlySection({
  docs, tenantId, requirement, folderKey, status, onRefresh, searchQuery,
}) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [revision, setRevision] = useState("1.0");
  const [emission, setEmission] = useState("");
  const [busy, setBusy] = useState(false);

  const filtered = docs.filter((d) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return [d.title, d.code, d.responsible, d.file_name].some((x) => (x || "").toLowerCase().includes(q));
  });

  const create = async () => {
    if (!title.trim()) return toast.error("Informe o título");
    setBusy(true);
    try {
      await createDocument({
        tenant_id: tenantId,
        requirement,
        folder_key: folderKey,
        section: "documento",
        title: title.trim(),
        version: revision,
        code: emission,
        status,
      }, user?.id);
      toast.success("Documento criado");
      setOpen(false);
      setTitle("");
      onRefresh?.();
    } catch {
      toast.error("Falha ao criar");
    } finally {
      setBusy(false);
    }
  };

  const variant = status === "vigente" ? "vigente" : "obsoleto";

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 text-white" size="sm"><Plus size={16} className="mr-1" /> Novo documento</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo documento</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Título</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Revisão</Label><Input value={revision} onChange={(e) => setRevision(e.target.value)} /></div>
                <div><Label>Emissão</Label><Input type="date" value={emission} onChange={(e) => setEmission(e.target.value)} /></div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button className="bg-blue-600 text-white" onClick={create} disabled={busy}>Criar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <Card className="overflow-hidden border-slate-200">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="bg-slate-50 text-left text-xs text-slate-600 uppercase">
            <tr>
              <th className="p-3">Documento</th>
              <th className="p-3">Responsável</th>
              <th className="p-3">Próx. revisão</th>
              <th className="p-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.length === 0 && (
              <tr><td colSpan={4} className="p-8 text-center text-slate-500">Nenhum documento.</td></tr>
            )}
            {filtered.map((d) => (
              <DocFileRow
                key={d.id}
                doc={d}
                variant={variant}
                onUpdate={(u) => onRefresh?.()}
                onDelete={() => onRefresh?.()}
              />
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
