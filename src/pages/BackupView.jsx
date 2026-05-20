import React, { useCallback, useEffect, useState, useRef } from "react";
import { useOutletContext } from "react-router-dom";
import {
  listBackupStatus,
  createAndDownloadBackup,
  restoreBackup,
  formatRestoreMessage,
} from "@/lib/backupApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { Database, DownloadSimple, UploadSimple, FileArchive, Warning, CheckCircle, HardDrives } from "@phosphor-icons/react";
import { toast } from "sonner";

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
  const [status, setStatus] = useState({ last_backup_at: null, auto_interval_days: 20 });
  const [busy, setBusy] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [openRestore, setOpenRestore] = useState(false);
  const [replace, setReplace] = useState(false);
  const fileRef = useRef();

  const load = useCallback(async () => {
    if (!currentTenantId) return;
    try {
      const raw = await listBackupStatus(currentTenantId);
      setStatus({
        last_backup_at: raw?.last_backup_at ?? null,
        auto_interval_days: raw?.auto_interval_days ?? 20,
      });
    } catch { /* ignore */ }
  }, [currentTenantId]);

  useEffect(() => {
    load();
  }, [load]);

  if (!currentTenantId) {
    return <div className="text-slate-600">Selecione um ambiente de cliente.</div>;
  }

  const generateAndDownload = async () => {
    setBusy(true);
    try {
      const result = await createAndDownloadBackup(currentTenantId);
      toast.success(
        result?.legacy_api_available === false
          ? "ZIP baixado. Documentos da API legada não foram incluídos — guarde o ficheiro em local seguro."
          : "ZIP baixado. Guarde o ficheiro no seu computador ou rede da empresa.",
      );
      await load();
    } catch (e) {
      toast.error(e?.message || "Falha ao gerar backup");
    } finally { setBusy(false); }
  };

  const restore = async (file) => {
    if (!window.confirm(replace
      ? "Atenção: o modo SUBSTITUIR irá APAGAR os dados atuais do ambiente antes de restaurar. Continuar?"
      : "Restaurar este backup (acrescentar dados do ZIP)?"
    )) return;
    setRestoring(true);
    try {
      const result = await restoreBackup(currentTenantId, file, replace);
      toast.success(formatRestoreMessage(result));
      setOpenRestore(false);
      await load();
    } catch (e) {
      const msg = e?.response?.data?.detail || e?.message || "Falha na restauração";
      toast.error(typeof msg === "string" ? msg : "Falha");
    } finally { setRestoring(false); }
  };

  const lastDays = daysAgo(status.last_backup_at);
  const health = lastDays === null ? "never"
    : lastDays > status.auto_interval_days ? "overdue"
    : lastDays > status.auto_interval_days - 5 ? "soon" : "ok";

  return (
    <div className="space-y-6" data-testid="backup-view">
      <div>
        <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Backup do sistema</div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mt-1">Backup &amp; Restauração</h1>
        <p className="text-sm text-slate-600 mt-1">
          Ambiente: <span className="font-medium text-slate-800">{currentTenant?.name}</span>.
          Os backups são ficheiros <strong>.zip</strong> no seu computador — não ficam guardados na nuvem.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-slate-200 md:col-span-2">
          <CardContent className="p-6 flex items-start justify-between gap-4">
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Último backup gerado</div>
              <div className="font-display text-2xl font-bold mt-2">
                {formatDate(status.last_backup_at)}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {health === "ok" && (<Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100"><CheckCircle size={14} className="mr-1" /> Em dia ({lastDays}d atrás)</Badge>)}
                {health === "soon" && (<Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100"><Warning size={14} className="mr-1" /> Próximo do limite ({lastDays}d)</Badge>)}
                {health === "overdue" && (<Badge className="bg-red-100 text-red-700 hover:bg-red-100"><Warning size={14} className="mr-1" /> Atrasado ({lastDays}d)</Badge>)}
                {health === "never" && (<Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100"><Warning size={14} className="mr-1" /> Nunca executado</Badge>)}
              </div>
              <p className="text-xs text-slate-500 mt-3">
                Recomendado: novo ZIP a cada {status.auto_interval_days} dias. Para recuperar dados antigos, use &quot;Restaurar&quot; com o ZIP guardado nessa data.
              </p>
            </div>
            <Database size={36} className="text-blue-600 shrink-0" weight="duotone" />
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="p-6">
            <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Ações</div>
            <div className="space-y-2 mt-3">
              <Button onClick={generateAndDownload} disabled={busy} className="w-full bg-blue-600 hover:bg-blue-700 text-white" data-testid="create-backup-btn">
                <DownloadSimple size={16} className="mr-1.5" /> {busy ? "Gerando ZIP…" : "Gerar e baixar backup"}
              </Button>
              <Dialog open={openRestore} onOpenChange={setOpenRestore}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full" data-testid="open-restore-btn">
                    <UploadSimple size={16} className="mr-1.5" /> Restaurar de ZIP
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="font-display">Restaurar backup (.zip)</DialogTitle>
                    <p className="text-sm text-slate-500 mt-1">
                      Selecione um ficheiro .zip que tenha sido gerado e guardado anteriormente neste ambiente.
                    </p>
                  </DialogHeader>
                  <div className="space-y-4 mt-2">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} data-testid="replace-checkbox" />
                      <span>
                        <strong>Modo substituir</strong> — apaga os dados atuais do ambiente antes (cuidado!)
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

      <Card className="border-slate-200 bg-slate-50/50">
        <CardContent className="p-6 flex gap-4 items-start">
          <HardDrives size={28} className="text-slate-500 shrink-0 mt-0.5" weight="duotone" />
          <div className="text-sm text-slate-600 space-y-2">
            <p className="font-medium text-slate-800">Como funciona</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Gerar e baixar</strong> — cria um ZIP com cadastros, coleta, anexos e (se configurado) documentos da API legada.</li>
              <li>Guarde o ZIP em pasta segura (PC, servidor ou nuvem da empresa).</li>
              <li><strong>Restaurar de ZIP</strong> — envia o ficheiro para repor dados neste ambiente; não é necessário ter o backup no Supabase.</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BackupView;
