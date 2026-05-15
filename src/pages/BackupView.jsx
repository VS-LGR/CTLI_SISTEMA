import React, { useEffect, useState, useRef } from "react";
import { useOutletContext } from "react-router-dom";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { Database, DownloadSimple, Trash, UploadSimple, ClockClockwise, FileArchive, Warning, CheckCircle } from "@phosphor-icons/react";
import { toast } from "sonner";

const formatBytes = (b) => {
  if (!b) return "0 B";
  const k = 1024, sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return `${(b / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
};

const formatDate = (s) => {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleString("pt-BR");
  } catch { return s; }
};

const daysAgo = (s) => {
  if (!s) return null;
  try {
    const diff = (Date.now() - new Date(s).getTime()) / (1000 * 60 * 60 * 24);
    return Math.floor(diff);
  } catch { return null; }
};

const BackupView = () => {
  const { currentTenantId, currentTenant } = useOutletContext();
  const [data, setData] = useState({ backups: [], last_backup_at: null, auto_interval_days: 20 });
  const [busy, setBusy] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [openRestore, setOpenRestore] = useState(false);
  const [replace, setReplace] = useState(false);
  const fileRef = useRef();

  const load = async () => {
    if (!currentTenantId) return;
    try {
      const { data } = await api.get(`/tenants/${currentTenantId}/backups`);
      setData(data);
    } catch { /* ignore */ }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [currentTenantId]);

  if (!currentTenantId) {
    return <div className="text-slate-600">Selecione um ambiente de cliente.</div>;
  }

  const createBackup = async () => {
    setBusy(true);
    try {
      await api.post(`/tenants/${currentTenantId}/backup`);
      toast.success("Backup criado");
      await load();
    } catch { toast.error("Falha ao criar backup"); }
    finally { setBusy(false); }
  };

  const download = async (b) => {
    try {
      const res = await api.get(`/tenants/${currentTenantId}/backups/${b.id}/download`, { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url; a.download = b.filename; a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error("Falha ao baixar"); }
  };

  const remove = async (b) => {
    if (!window.confirm(`Excluir o backup "${b.filename}"?`)) return;
    try {
      await api.delete(`/tenants/${currentTenantId}/backups/${b.id}`);
      toast.success("Excluído");
      await load();
    } catch { toast.error("Falha"); }
  };

  const restore = async (file) => {
    if (!window.confirm(replace
      ? "Atenção: o modo SUBSTITUIR irá APAGAR todos os documentos e responsáveis atuais antes de restaurar. Continuar?"
      : "Restaurar este backup (acrescentar)?"
    )) return;
    setRestoring(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post(`/tenants/${currentTenantId}/restore?replace=${replace}`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success(`Restaurados ${data.documents_restored} documentos e ${data.responsibles_restored} responsáveis`);
      setOpenRestore(false);
      await load();
    } catch (e) {
      const msg = e.response?.data?.detail || "Falha na restauração";
      toast.error(typeof msg === "string" ? msg : "Falha");
    } finally { setRestoring(false); }
  };

  const lastDays = daysAgo(data.last_backup_at);
  const status = lastDays === null ? "never"
    : lastDays > data.auto_interval_days ? "overdue"
    : lastDays > data.auto_interval_days - 5 ? "soon" : "ok";

  return (
    <div className="space-y-6" data-testid="backup-view">
      <div>
        <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Backup do sistema</div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900 mt-1">Backup &amp; Restauração</h1>
        <p className="text-sm text-slate-600 mt-1">
          Ambiente: <span className="font-medium text-slate-800">{currentTenant?.name}</span>. Backup automático a cada {data.auto_interval_days} dias.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-slate-200 md:col-span-2">
          <CardContent className="p-6 flex items-start justify-between gap-4">
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Último backup</div>
              <div className="font-display text-2xl font-bold mt-2">
                {formatDate(data.last_backup_at)}
              </div>
              <div className="mt-2 flex items-center gap-2">
                {status === "ok" && (<Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100"><CheckCircle size={14} className="mr-1" /> Em dia ({lastDays}d atrás)</Badge>)}
                {status === "soon" && (<Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100"><Warning size={14} className="mr-1" /> Próximo do limite ({lastDays}d)</Badge>)}
                {status === "overdue" && (<Badge className="bg-red-100 text-red-700 hover:bg-red-100"><Warning size={14} className="mr-1" /> Atrasado ({lastDays}d)</Badge>)}
                {status === "never" && (<Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100"><Warning size={14} className="mr-1" /> Nunca executado</Badge>)}
              </div>
            </div>
            <Database size={36} className="text-blue-600" weight="duotone" />
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="p-6">
            <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Ações</div>
            <div className="space-y-2 mt-3">
              <Button onClick={createBackup} disabled={busy} className="w-full bg-blue-600 hover:bg-blue-700 text-white" data-testid="create-backup-btn">
                <FileArchive size={16} className="mr-1.5" /> {busy ? "Gerando…" : "Gerar backup agora"}
              </Button>
              <Dialog open={openRestore} onOpenChange={setOpenRestore}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full" data-testid="open-restore-btn">
                    <UploadSimple size={16} className="mr-1.5" /> Restaurar backup
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="font-display">Restaurar backup (.zip)</DialogTitle>
                    <p className="text-sm text-slate-500 mt-1">Faça upload de um arquivo de backup gerado anteriormente.</p>
                  </DialogHeader>
                  <div className="space-y-4 mt-2">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} data-testid="replace-checkbox" />
                      <span>
                        <strong>Modo substituir</strong> — apaga documentos e responsáveis atuais antes (cuidado!)
                      </span>
                    </label>
                    <input ref={fileRef} type="file" accept=".zip" hidden
                      onChange={(e) => e.target.files?.[0] && restore(e.target.files[0])} data-testid="restore-file-input" />
                    <Button onClick={() => fileRef.current?.click()} disabled={restoring} className="w-full bg-blue-600 hover:bg-blue-700 text-white" data-testid="select-backup-zip">
                      <UploadSimple size={16} className="mr-1.5" /> {restoring ? "Restaurando…" : "Selecionar arquivo .zip"}
                    </Button>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setOpenRestore(false)}>Fechar</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200">
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-lg flex items-center gap-2"><ClockClockwise size={18} /> Histórico de backups</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {data.backups.length === 0 ? (
            <div className="text-center py-12 text-sm text-slate-500">
              <FileArchive size={36} className="mx-auto text-slate-300 mb-2" />
              Nenhum backup gerado ainda. Clique em "Gerar backup agora".
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200">
                <tr className="text-left text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  <th className="px-2 py-3">Arquivo</th>
                  <th className="px-2 py-3">Data</th>
                  <th className="px-2 py-3">Documentos</th>
                  <th className="px-2 py-3">Tamanho</th>
                  <th className="px-2 py-3">Origem</th>
                  <th className="px-2 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.backups.map((b) => (
                  <tr key={b.id} data-testid={`backup-row-${b.id}`} className="hover:bg-slate-50">
                    <td className="px-2 py-3 font-mono text-xs">{b.filename}</td>
                    <td className="px-2 py-3 text-slate-600">{formatDate(b.created_at)}</td>
                    <td className="px-2 py-3">{b.doc_count}</td>
                    <td className="px-2 py-3 text-slate-600">{formatBytes(b.size_bytes)}</td>
                    <td className="px-2 py-3">
                      <Badge variant="outline" className="text-[10px]">{b.source === "auto" ? "Automático" : "Manual"}</Badge>
                    </td>
                    <td className="px-2 py-3 text-right">
                      <Button variant="ghost" size="sm" onClick={() => download(b)} data-testid={`download-backup-${b.id}`}><DownloadSimple size={16} /></Button>
                      <Button variant="ghost" size="sm" onClick={() => remove(b)} className="text-red-600 hover:text-red-700" data-testid={`delete-backup-${b.id}`}><Trash size={16} /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BackupView;
