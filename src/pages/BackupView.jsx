import React, { useCallback, useEffect, useState, useRef } from "react";
import { useOutletContext } from "react-router-dom";
import {
  listBackupStatus,
  createAndDownloadBackup,
  restoreBackup,
  dryRunBackup,
  formatRestoreMessage,
  formatDryRunSummary,
  shortHash,
} from "@/lib/backupApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Database, DownloadSimple, UploadSimple, Warning, CheckCircle, HardDrives, ShieldCheck, MagnifyingGlass,
} from "@phosphor-icons/react";
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

const ACTION_LABEL = {
  create: "Criação",
  restore: "Restore",
  download: "Download",
  purge: "Purga",
  verify_fail: "Falha integridade",
  dry_run: "Dry-run",
  pre_replace_backup: "Pré-replace",
  reauth_fail: "Reauth falhou",
};

const BackupView = () => {
  const { currentTenantId, currentTenant } = useOutletContext();
  const [status, setStatus] = useState({
    last_backup_at: null,
    auto_interval_days: 20,
    backup_retention_days: 90,
    backups: [],
    events: [],
  });
  const [busy, setBusy] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [dryRunning, setDryRunning] = useState(false);
  const [openRestore, setOpenRestore] = useState(false);
  const [replace, setReplace] = useState(false);
  const [confirmPhrase, setConfirmPhrase] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [dryRunReport, setDryRunReport] = useState(null);
  const [lastSha256, setLastSha256] = useState("");
  const fileRef = useRef();
  const dryRunFileRef = useRef();

  const load = useCallback(async () => {
    if (!currentTenantId) return;
    try {
      const raw = await listBackupStatus(currentTenantId);
      setStatus({
        last_backup_at: raw?.last_backup_at ?? null,
        auto_interval_days: raw?.auto_interval_days ?? 20,
        backup_retention_days: raw?.backup_retention_days ?? 90,
        backups: raw?.backups || [],
        events: raw?.events || [],
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
      setLastSha256(result?.sha256 || "");
      const sizeMb = result?.size_bytes != null
        ? ` (${(result.size_bytes / (1024 * 1024)).toFixed(1)} MB)`
        : "";
      const hashNote = result?.sha256 ? ` SHA-256: ${shortHash(result.sha256)}.` : "";
      toast.success(
        result?.legacy_api_available === false
          ? `ZIP baixado${sizeMb}.${hashNote} Documentos da API legada não foram incluídos — guarde cópia em local seguro.`
          : `ZIP baixado${sizeMb}.${hashNote} Guarde uma cópia no computador ou rede da empresa.`,
      );
      await load();
    } catch (e) {
      toast.error(e?.message || "Falha ao gerar backup");
    } finally { setBusy(false); }
  };

  const runDryRun = async (file) => {
    if (!file) return;
    setDryRunning(true);
    setDryRunReport(null);
    try {
      const report = await dryRunBackup(currentTenantId, file);
      setDryRunReport(report);
      toast.success(formatDryRunSummary(report));
      await load();
    } catch (e) {
      toast.error(e?.message || "Falha no dry-run");
    } finally {
      setDryRunning(false);
    }
  };

  const restore = async () => {
    if (!selectedFile) {
      toast.error("Selecione um ficheiro ZIP");
      return;
    }
    if (replace) {
      if (confirmPhrase.trim().toUpperCase() !== "SUBSTITUIR") {
        toast.error('Digite SUBSTITUIR para confirmar o modo substituir');
        return;
      }
      if (!confirmPassword) {
        toast.error("Informe a senha do administrador para reautenticar");
        return;
      }
    } else if (!window.confirm("Restaurar este backup (acrescentar dados do ZIP)?")) {
      return;
    }

    setRestoring(true);
    try {
      const result = await restoreBackup(currentTenantId, selectedFile, replace, {
        confirmPassword,
        confirmPhrase,
      });
      toast.success(formatRestoreMessage(result));
      setOpenRestore(false);
      setSelectedFile(null);
      setConfirmPassword("");
      setConfirmPhrase("");
      setReplace(false);
      setDryRunReport(null);
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

  const topDeltas = dryRunReport?.deltas
    ? Object.entries(dryRunReport.deltas)
      .filter(([, v]) => v && typeof v.delta === "number" && v.delta !== 0)
      .sort((a, b) => Math.abs(b[1].delta) - Math.abs(a[1].delta))
      .slice(0, 8)
    : [];

  return (
    <div className="space-y-6" data-testid="backup-view">
      <div>
        <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Backup do sistema</div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mt-1">Backup &amp; Restauração</h1>
        <p className="text-sm text-slate-600 mt-1">
          Ambiente: <span className="font-medium text-slate-800">{currentTenant?.name}</span>.
          P2: dry-run, backup automático antes de replace e reautenticação no restore destrutivo.
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
                <Badge variant="secondary" className="gap-1">
                  <ShieldCheck size={12} /> Retenção {status.backup_retention_days}d
                </Badge>
              </div>
              {lastSha256 && (
                <p className="text-xs text-slate-500 mt-2 font-mono">Último SHA-256: {shortHash(lastSha256)}</p>
              )}
              <p className="text-xs text-slate-500 mt-3">
                Recomendado: novo ZIP a cada {status.auto_interval_days} dias. Antes de um DR drill, execute dry-run e guarde evidências (docs/11-BACKUP-DR-QIQO.md).
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
              <input
                ref={dryRunFileRef}
                type="file"
                accept=".zip"
                hidden
                onChange={(e) => e.target.files?.[0] && runDryRun(e.target.files[0])}
                data-testid="dry-run-file-input"
              />
              <Button
                variant="outline"
                className="w-full"
                disabled={dryRunning}
                onClick={() => dryRunFileRef.current?.click()}
                data-testid="dry-run-btn"
              >
                <MagnifyingGlass size={16} className="mr-1.5" />
                {dryRunning ? "A analisar…" : "Dry-run (sem gravar)"}
              </Button>
              <Dialog open={openRestore} onOpenChange={(open) => {
                setOpenRestore(open);
                if (!open) {
                  setSelectedFile(null);
                  setConfirmPassword("");
                  setConfirmPhrase("");
                  setReplace(false);
                }
              }}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full" data-testid="open-restore-btn">
                    <UploadSimple size={16} className="mr-1.5" /> Restaurar de ZIP
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle className="font-display">Restaurar backup (.zip)</DialogTitle>
                    <p className="text-sm text-slate-500 mt-1">
                      Preferir dry-run primeiro. Modo substituir exige frase + senha e gera backup de segurança automático.
                    </p>
                  </DialogHeader>
                  <div className="space-y-4 mt-2">
                    <div>
                      <Label className="text-xs">Ficheiro ZIP</Label>
                      <input
                        ref={fileRef}
                        type="file"
                        accept=".zip"
                        className="mt-1 block w-full text-sm"
                        onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                        data-testid="restore-file-input"
                      />
                      {selectedFile && (
                        <p className="text-xs text-slate-500 mt-1">{selectedFile.name}</p>
                      )}
                    </div>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} data-testid="replace-checkbox" />
                      <span>
                        <strong>Modo substituir</strong> — apaga os dados atuais antes (destrutivo)
                      </span>
                    </label>
                    {replace && (
                      <div className="space-y-3 rounded-md border border-amber-200 bg-amber-50/60 p-3">
                        <p className="text-xs text-amber-900">
                          Será criado um backup automático <em>pre-replace</em> antes de apagar dados.
                        </p>
                        <div>
                          <Label className="text-xs">Digite SUBSTITUIR</Label>
                          <Input
                            className="h-9 mt-1"
                            value={confirmPhrase}
                            onChange={(e) => setConfirmPhrase(e.target.value)}
                            placeholder="SUBSTITUIR"
                            data-testid="confirm-phrase"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Senha do administrador (reauth)</Label>
                          <Input
                            type="password"
                            className="h-9 mt-1"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            autoComplete="current-password"
                            data-testid="confirm-password"
                          />
                        </div>
                      </div>
                    )}
                    <Button
                      onClick={restore}
                      disabled={restoring || !selectedFile}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                      data-testid="confirm-restore-btn"
                    >
                      <UploadSimple size={16} className="mr-1.5" />
                      {restoring ? "Restaurando…" : replace ? "Confirmar substituição" : "Restaurar (merge)"}
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

      {dryRunReport && (
        <Card className="border-slate-200">
          <CardContent className="p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Relatório dry-run</div>
              {dryRunReport.integrity_verified ? (
                <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Integridade OK</Badge>
              ) : (
                <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-100">Sem integrity v3</Badge>
              )}
              <span className="text-xs text-slate-500 font-mono">{shortHash(dryRunReport.sha256)}</span>
            </div>
            <p className="text-sm text-slate-700">{formatDryRunSummary(dryRunReport)}</p>
            {dryRunReport.warnings?.length > 0 && (
              <ul className="text-xs text-amber-800 list-disc pl-5">
                {dryRunReport.warnings.map((w) => <li key={w}>{w}</li>)}
              </ul>
            )}
            {topDeltas.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="text-left text-slate-500">
                    <tr>
                      <th className="py-1 pr-2">Tabela</th>
                      <th className="py-1 pr-2">ZIP</th>
                      <th className="py-1 pr-2">Atual</th>
                      <th className="py-1">Δ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {topDeltas.map(([table, v]) => (
                      <tr key={table}>
                        <td className="py-1 pr-2 font-mono">{table}</td>
                        <td className="py-1 pr-2">{v.zip}</td>
                        <td className="py-1 pr-2">{v.live ?? "—"}</td>
                        <td className="py-1">{v.delta > 0 ? `+${v.delta}` : v.delta}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {status.backups?.length > 0 && (
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-2">Cópias no Storage</div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-left text-slate-500">
                  <tr>
                    <th className="py-1 pr-2">Ficheiro</th>
                    <th className="py-1 pr-2">Criado</th>
                    <th className="py-1">Tamanho</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {status.backups.slice(0, 10).map((b) => (
                    <tr key={b.storage_path || b.name}>
                      <td className="py-1.5 pr-2 font-mono truncate max-w-[280px]">{b.name}</td>
                      <td className="py-1.5 pr-2">{formatDate(b.created_at)}</td>
                      <td className="py-1.5">
                        {b.size_bytes != null ? `${(b.size_bytes / (1024 * 1024)).toFixed(1)} MB` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {status.events?.length > 0 && (
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-2">Audit trail de backup</div>
            <div className="overflow-x-auto max-h-64 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="text-left text-slate-500 sticky top-0 bg-white">
                  <tr>
                    <th className="py-1 pr-2">Quando</th>
                    <th className="py-1 pr-2">Ação</th>
                    <th className="py-1 pr-2">Resultado</th>
                    <th className="py-1 pr-2">Ator</th>
                    <th className="py-1">SHA-256</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {status.events.map((ev) => (
                    <tr key={ev.id}>
                      <td className="py-1.5 pr-2 whitespace-nowrap">{formatDate(ev.created_at)}</td>
                      <td className="py-1.5 pr-2">
                        {ACTION_LABEL[ev.action] || ev.action}
                        {ev.restore_mode ? ` (${ev.restore_mode})` : ""}
                      </td>
                      <td className="py-1.5 pr-2">
                        <Badge
                          variant="secondary"
                          className={
                            ev.outcome === "success"
                              ? "bg-emerald-50 text-emerald-800"
                              : "bg-red-50 text-red-800"
                          }
                        >
                          {ev.outcome}
                        </Badge>
                      </td>
                      <td className="py-1.5 pr-2 truncate max-w-[140px]">
                        {ev.actor_full_name || ev.actor_email || "—"}
                      </td>
                      <td className="py-1.5 font-mono">{ev.sha256 ? shortHash(ev.sha256) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-slate-200 bg-slate-50/50">
        <CardContent className="p-6 flex gap-4 items-start">
          <HardDrives size={28} className="text-slate-500 shrink-0 mt-0.5" weight="duotone" />
          <div className="text-sm text-slate-600 space-y-2">
            <p className="font-medium text-slate-800">Como funciona (P2)</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Dry-run</strong> — analisa o ZIP (integridade + contagens) sem gravar.</li>
              <li><strong>Replace</strong> — exige digitar SUBSTITUIR + senha; gera backup <em>pre-replace</em> automático.</li>
              <li><strong>Audit trail</strong> — create, dry_run, pre_replace_backup, restore, reauth_fail, purge.</li>
              <li>DR drill periódico: seguir protocolo QI/QO em <code>docs/11-BACKUP-DR-QIQO.md</code>.</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BackupView;
