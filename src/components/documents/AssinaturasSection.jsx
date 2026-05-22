import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash, Eye } from "@phosphor-icons/react";
import { toast } from "sonner";
import { createDocument, deleteDocument, uploadDocumentFile } from "@/lib/documentsApi";
import ConfirmDeleteDialog from "@/components/documents/ConfirmDeleteDialog";
import { useAuth } from "@/context/AuthContext";
import { signedUrlForDoc } from "@/lib/documentFiles";

export default function AssinaturasSection({
  docs,
  tenantId,
  requirement,
  folderKey,
  onRefresh,
  searchQuery = "",
}) {
  const { user } = useAuth();
  const fileRef = useRef();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  const filtered = docs.filter((d) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (d.title || "").toLowerCase().includes(q) || (d.file_name || "").toLowerCase().includes(q);
  });

  const save = async () => {
    if (!title.trim()) return toast.error("Informe o nome");
    if (!file) return toast.error("Selecione uma imagem PNG ou WebP");
    const mime = file.type || "";
    if (!mime.includes("png") && !mime.includes("webp") && !mime.includes("jpeg")) {
      return toast.error("Use PNG, WebP ou JPEG");
    }
    setBusy(true);
    try {
      const doc = await createDocument({
        tenant_id: tenantId,
        requirement,
        folder_key: folderKey,
        section: "assinatura",
        title: title.trim(),
        status: "vigente",
      }, user?.id);
      await uploadDocumentFile(doc.id, file, user?.id, "");
      toast.success("Assinatura cadastrada");
      setOpen(false);
      setTitle("");
      setFile(null);
      onRefresh?.();
    } catch (e) {
      toast.error(e?.message || "Falha ao guardar");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!deleteId) return;
    setBusy(true);
    try {
      await deleteDocument(deleteId);
      toast.success("Removido");
      setDeleteId(null);
      onRefresh?.();
    } catch (e) {
      toast.error(e?.message || "Falha ao excluir");
    } finally {
      setBusy(false);
    }
  };

  const preview = async (doc) => {
    try {
      const url = await signedUrlForDoc(doc);
      setPreviewUrl(url);
    } catch {
      toast.error("Não foi possível pré-visualizar");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button className="bg-blue-600 text-white" size="sm" onClick={() => setOpen(true)}>
          <Plus size={16} className="mr-1" /> Nova assinatura
        </Button>
      </div>
      {filtered.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-12 border rounded-lg bg-slate-50">
          Nenhuma assinatura cadastrada.
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {filtered.map((d) => (
            <Card key={d.id} className="border-slate-200 overflow-hidden">
              <CardContent className="p-3 space-y-2">
                <p className="text-sm font-medium truncate" title={d.title}>{d.title}</p>
                <div className="aspect-[3/1] bg-slate-100 rounded flex items-center justify-center text-xs text-slate-400">
                  {d.has_file ? "Imagem" : "—"}
                </div>
                <div className="flex gap-1 justify-end">
                  <Button variant="ghost" size="sm" onClick={() => preview(d)} title="Visualizar">
                    <Eye size={16} />
                  </Button>
                  <Button variant="ghost" size="sm" className="text-red-600" onClick={() => setDeleteId(d.id)}>
                    <Trash size={16} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova assinatura</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
            <div>
              <Label>Imagem (PNG / WebP)</Label>
              <Input type="file" accept="image/png,image/webp,image/jpeg" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button className="bg-blue-600 text-white" onClick={save} disabled={busy}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!previewUrl} onOpenChange={(v) => !v && setPreviewUrl(null)}>
        <DialogContent className="max-w-lg">
          {previewUrl && <img src={previewUrl} alt="Assinatura" className="max-w-full h-auto mx-auto" />}
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={!!deleteId}
        onOpenChange={(v) => !v && setDeleteId(null)}
        title="Excluir assinatura?"
        onConfirm={remove}
        busy={busy}
      />
    </div>
  );
}
