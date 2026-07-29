import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  CheckCircle,
  DownloadSimple,
  MagnifyingGlass,
  UploadSimple,
  Warning,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const formatDate = (s) => {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleString("pt-BR");
  } catch {
    return s;
  }
};

const daysAgo = (s) => {
  if (!s) return null;
  try {
    return Math.floor((Date.now() - new Date(s).getTime()) / (1000 * 60 * 60 * 24));
  } catch {
    return null;
  }
};

const ACTION_LABEL = {
  create: "Cópia gerada",
  restore: "Restauração",
  download: "Download",
  purge: "Purga",
  verify_fail: "Integridade",
  dry_run: "Verificação",
  pre_replace_backup: "Pré-substituição",
  reauth_fail: "Reauth",
};

export default function BackupView() {
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
  const [replace, setReplace] = useState(false);
  const [confirmPhrase, setConfirmPhrase] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [zipFile, setZipFile] = useState(null);
  const [dryRunReport, setDryRunReport] = useState(null);
  const [lastSha256, setLastSha256] = useState("");
  const fileRef = useRef();

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
    } catch {
      /* ignore */
    }
  }, [currentTenantId]);

  useEffect(() => {
    load();
  }, [load]);

  const lastDays = daysAgo(status.last_backup_at);
  const health = lastDays === null
    ? "never"
    : lastDays > status.auto_interval_days
      ? "overdue"
      : lastDays > status.auto_interval_days - 5
        ? "soon"
        : "ok";

  const topDeltas = useMemo(() => {
    if (!dryRunReport?.deltas) return [];
    return Object.entries(dryRunReport.deltas)
      .filter(([, v]) => v && typeof v.delta === "number" && v.delta !== 0)
      .sort((a, b) => Math.abs(b[1].delta) - Math.abs(a[1].delta))
      .slice(0, 6);
  }, [dryRunReport]);

  if (!currentTenantId) {
    return <p className="text-sm text-slate-500">Selecione um ambiente de cliente.</p>;
  }

  const onPickZip = (file) => {
    setZipFile(file || null);
    setDryRunReport(null);
  };

  const generateAndDownload = async () => {
    setBusy(true);
    try {
      const result = await createAndDownloadBackup(currentTenantId);
      setLastSha256(result?.sha256 || "");
      const sizeMb = result?.size_bytes != null
        ? ` · ${(result.size_bytes / (1024 * 1024)).toFixed(1)} MB`
        : "";
      toast.success(`Cópia gerada${sizeMb}. Guarde também na rede da empresa.`);
      await load();
    } catch (e) {
      toast.error(e?.message || "Falha ao gerar cópia");
    } finally {
      setBusy(false);
    }
  };

  const runDryRun = async () => {
    if (!zipFile) {
      toast.error("Escolha um ficheiro ZIP");
      return;
    }
    setDryRunning(true);
    try {
      const report = await dryRunBackup(currentTenantId, zipFile);
      setDryRunReport(report);
      toast.success(formatDryRunSummary(report));
      await load();
    } catch (e) {
      toast.error(e?.message || "Falha na verificação");
    } finally {
      setDryRunning(false);
    }
  };

  const canReplace = !replace
    || (confirmPhrase.trim().toUpperCase() === "SUBSTITUIR" && Boolean(confirmPassword));

  const restore = async () => {
    if (!zipFile) {
      toast.error("Escolha um ficheiro ZIP");
      return;
    }
    if (replace && !canReplace) {
      toast.error("Confirme SUBSTITUIR e a senha do administrador");
      return;
    }
    if (!replace) {
      const ok = window.confirm(
        "Restaurar em modo acrescentar?\n\nOs dados atuais mantêm-se; o ZIP é importado com novos IDs.",
      );
      if (!ok) return;
    }

    setRestoring(true);
    try {
      const result = await restoreBackup(currentTenantId, zipFile, replace, {
        confirmPassword,
        confirmPhrase,
      });
      toast.success(formatRestoreMessage(result));
      setZipFile(null);
      setDryRunReport(null);
      setConfirmPassword("");
      setConfirmPhrase("");
      setReplace(false);
      if (fileRef.current) fileRef.current.value = "";
      await load();
    } catch (e) {
      toast.error(e?.message || "Falha na restauração");
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl" data-testid="backup-view">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Continuidade</div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mt-1">
            Backup
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {currentTenant?.name}
            <span className="text-slate-300 mx-2">·</span>
            Gere, verifique e restaure a cópia do ambiente
          </p>
        </div>
        <Button
          onClick={generateAndDownload}
          disabled={busy}
          className="bg-blue-600 hover:bg-blue-700 text-white shrink-0"
          data-testid="create-backup-btn"
        >
          <DownloadSimple size={16} className="mr-1.5" />
          {busy ? "A gerar…" : "Gerar cópia"}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-600">
        <span>
          Última cópia{" "}
          <span className="font-medium text-slate-900">{formatDate(status.last_backup_at)}</span>
        </span>
        {health === "ok" && (
          <Badge className="bg-emerald-50 text-emerald-800 hover:bg-emerald-50 gap-1 font-normal">
            <CheckCircle size={12} /> Em dia
          </Badge>
        )}
        {health === "soon" && (
          <Badge className="bg-amber-50 text-amber-900 hover:bg-amber-50 gap-1 font-normal">
            <Warning size={12} /> Próximo do intervalo
          </Badge>
        )}
        {health === "overdue" && (
          <Badge className="bg-red-50 text-red-800 hover:bg-red-50 gap-1 font-normal">
            <Warning size={12} /> Atrasado ({lastDays}d)
          </Badge>
        )}
        {health === "never" && (
          <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-100 gap-1 font-normal">
            Sem cópia ainda
          </Badge>
        )}
        <span className="text-xs text-slate-400">
          Retenção {status.backup_retention_days}d
          {lastSha256 ? ` · ${shortHash(lastSha256)}` : ""}
        </span>
      </div>

      <section className="space-y-4">
        <div>
          <h2 className="font-display text-lg font-semibold text-slate-900">Trabalhar com um ZIP</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Escolha o ficheiro uma vez — depois verifique (sem gravar) ou restaure.
          </p>
        </div>

        <Card className="border-slate-200 shadow-none">
          <CardContent className="p-5 sm:p-6 space-y-5">
            <div>
              <Label className="text-xs text-slate-500">Ficheiro .zip</Label>
              <input
                ref={fileRef}
                type="file"
                accept=".zip,application/zip"
                className="mt-1.5 block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
                onChange={(e) => onPickZip(e.target.files?.[0])}
                data-testid="restore-file-input"
              />
              {zipFile && (
                <p className="text-xs text-slate-400 mt-1.5 truncate">{zipFile.name}</p>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={dryRunning || !zipFile}
                onClick={runDryRun}
                data-testid="dry-run-btn"
              >
                <MagnifyingGlass size={16} className="mr-1.5" />
                {dryRunning ? "A verificar…" : "Verificar"}
              </Button>
              <Button
                type="button"
                disabled={restoring || !zipFile || (replace && !canReplace)}
                onClick={restore}
                className={cn(
                  "text-white",
                  replace ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700",
                )}
                data-testid="confirm-restore-btn"
              >
                <UploadSimple size={16} className="mr-1.5" />
                {restoring
                  ? "A restaurar…"
                  : replace
                    ? "Substituir ambiente"
                    : "Restaurar (acrescentar)"}
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setReplace(false)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  !replace
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                )}
              >
                Acrescentar
              </button>
              <button
                type="button"
                onClick={() => setReplace(true)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  replace
                    ? "bg-red-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                )}
                data-testid="replace-checkbox"
              >
                Substituir
              </button>
              <span className="self-center text-xs text-slate-400">
                {replace
                  ? "Apaga dados cobertos · gera cópia de segurança · exige senha"
                  : "Mantém dados atuais · importa com novos IDs"}
              </span>
            </div>

            {replace && (
              <div className="grid sm:grid-cols-2 gap-3 pt-1 border-t border-slate-100">
                <div>
                  <Label className="text-xs text-slate-500">Digite SUBSTITUIR</Label>
                  <Input
                    className="h-9 mt-1"
                    value={confirmPhrase}
                    onChange={(e) => setConfirmPhrase(e.target.value)}
                    placeholder="SUBSTITUIR"
                    data-testid="confirm-phrase"
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Senha do administrador</Label>
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

            {dryRunReport && (
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="text-sm font-medium text-slate-800">Resultado da verificação</span>
                  {dryRunReport.integrity_verified ? (
                    <span className="text-xs text-emerald-700">Integridade OK</span>
                  ) : (
                    <span className="text-xs text-amber-700">Sem integrity v3</span>
                  )}
                  <span className="text-xs font-mono text-slate-400">{shortHash(dryRunReport.sha256)}</span>
                </div>
                <p className="text-sm text-slate-600">{formatDryRunSummary(dryRunReport)}</p>
                {dryRunReport.warnings?.length > 0 && (
                  <ul className="text-xs text-amber-800/90 space-y-0.5">
                    {dryRunReport.warnings.map((w) => (
                      <li key={w}>· {w}</li>
                    ))}
                  </ul>
                )}
                {topDeltas.length > 0 && (
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-slate-400 border-b border-slate-100">
                        <th className="py-1.5 font-medium">Tabela</th>
                        <th className="py-1.5 font-medium">ZIP</th>
                        <th className="py-1.5 font-medium">Atual</th>
                        <th className="py-1.5 font-medium">Δ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topDeltas.map(([table, v]) => (
                        <tr key={table} className="border-b border-slate-50">
                          <td className="py-1.5 font-mono text-slate-600">{table}</td>
                          <td className="py-1.5">{v.zip}</td>
                          <td className="py-1.5">{v.live ?? "—"}</td>
                          <td className="py-1.5 text-slate-800">{v.delta > 0 ? `+${v.delta}` : v.delta}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <div className="grid md:grid-cols-2 gap-8">
        <section>
          <h2 className="font-display text-base font-semibold text-slate-900 mb-3">Storage</h2>
          {!status.backups?.length ? (
            <p className="text-sm text-slate-400">Nenhuma cópia listada ainda.</p>
          ) : (
            <ul className="space-y-2">
              {status.backups.slice(0, 8).map((b) => (
                <li key={b.storage_path || b.name} className="text-sm flex justify-between gap-3">
                  <span className="font-mono text-xs text-slate-600 truncate">{b.name}</span>
                  <span className="text-xs text-slate-400 shrink-0 whitespace-nowrap">
                    {formatDate(b.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="font-display text-base font-semibold text-slate-900 mb-3">Histórico</h2>
          {!status.events?.length ? (
            <p className="text-sm text-slate-400">Sem eventos registados.</p>
          ) : (
            <ul className="space-y-2.5">
              {status.events.slice(0, 8).map((ev) => (
                <li key={ev.id} className="text-sm flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-slate-800">
                      {ACTION_LABEL[ev.action] || ev.action}
                      {ev.restore_mode ? (
                        <span className="text-slate-400"> · {ev.restore_mode}</span>
                      ) : null}
                    </div>
                    <div className="text-xs text-slate-400 truncate">
                      {ev.actor_full_name || ev.actor_email || "—"}
                      {ev.sha256 ? ` · ${shortHash(ev.sha256)}` : ""}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className={cn(
                      "text-[11px]",
                      ev.outcome === "success" ? "text-emerald-700" : "text-red-700",
                    )}>
                      {ev.outcome}
                    </div>
                    <div className="text-[11px] text-slate-400 whitespace-nowrap">
                      {formatDate(ev.created_at)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
