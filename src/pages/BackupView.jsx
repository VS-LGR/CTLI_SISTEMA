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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  ArrowRight,
  CheckCircle,
  Database,
  DownloadSimple,
  HardDrives,
  MagnifyingGlass,
  ShieldCheck,
  UploadSimple,
  Warning,
} from "@phosphor-icons/react";
import { toast } from "sonner";

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
  purge: "Purga (retenção)",
  verify_fail: "Falha de integridade",
  dry_run: "Verificação (dry-run)",
  pre_replace_backup: "Cópia pré-substituição",
  reauth_fail: "Reautenticação falhou",
};

function FlowStep({ n, title, children, active }) {
  return (
    <div className={`rounded-lg border p-4 ${active ? "border-blue-200 bg-blue-50/40" : "border-slate-200 bg-white"}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-[11px] font-semibold text-white">
          {n}
        </span>
        <h3 className="font-display text-sm font-semibold text-slate-900">{title}</h3>
      </div>
      <div className="text-sm text-slate-600 space-y-2 pl-8">{children}</div>
    </div>
  );
}

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
  const [tab, setTab] = useState("fluxo");
  const [replace, setReplace] = useState(false);
  const [confirmPhrase, setConfirmPhrase] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [dryRunFile, setDryRunFile] = useState(null);
  const [dryRunReport, setDryRunReport] = useState(null);
  const [lastSha256, setLastSha256] = useState("");
  const [openReplaceHelp, setOpenReplaceHelp] = useState(false);
  const dryRunInputRef = useRef();
  const restoreInputRef = useRef();

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
      .slice(0, 10);
  }, [dryRunReport]);

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
      toast.success(
        `Cópia gerada${sizeMb}${result?.sha256 ? ` · ${shortHash(result.sha256)}` : ""}. Guarde também na rede da empresa.`,
      );
      await load();
      setTab("historico");
    } catch (e) {
      toast.error(e?.message || "Falha ao gerar cópia");
    } finally {
      setBusy(false);
    }
  };

  const runDryRun = async () => {
    if (!dryRunFile) {
      toast.error("Selecione um ficheiro ZIP para verificar");
      return;
    }
    setDryRunning(true);
    setDryRunReport(null);
    try {
      const report = await dryRunBackup(currentTenantId, dryRunFile);
      setDryRunReport(report);
      toast.success(formatDryRunSummary(report));
      await load();
    } catch (e) {
      const msg = e?.message || "Falha na verificação";
      toast.error(msg);
    } finally {
      setDryRunning(false);
    }
  };

  const canReplace =
    !replace
    || (
      confirmPhrase.trim().toUpperCase() === "SUBSTITUIR"
      && Boolean(confirmPassword)
    );

  const restore = async () => {
    if (!selectedFile) {
      toast.error("Selecione o ficheiro ZIP a restaurar");
      return;
    }
    if (replace && !canReplace) {
      toast.error("Complete a confirmação do modo substituir (frase + senha)");
      return;
    }
    if (!replace) {
      const ok = window.confirm(
        "Restaurar em modo acrescentar (merge)?\n\nOs dados atuais mantêm-se; o ZIP é importado com novos IDs.",
      );
      if (!ok) return;
    }

    setRestoring(true);
    try {
      const result = await restoreBackup(currentTenantId, selectedFile, replace, {
        confirmPassword,
        confirmPhrase,
      });
      toast.success(formatRestoreMessage(result));
      setSelectedFile(null);
      setConfirmPassword("");
      setConfirmPhrase("");
      setReplace(false);
      await load();
      setTab("historico");
    } catch (e) {
      toast.error(e?.message || "Falha na restauração");
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl" data-testid="backup-view">
      <div>
        <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Continuidade · ambiente</div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mt-1">
          Backup &amp; restauração
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Ambiente <span className="font-medium text-slate-800">{currentTenant?.name}</span>.
          Gere uma cópia completa, verifique o ZIP sem alterar dados e só depois restaure.
        </p>
      </div>

      <Card className="border-slate-200">
        <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Última cópia gerada</div>
            <div className="font-display text-xl font-semibold text-slate-900 mt-1">
              {formatDate(status.last_backup_at)}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {health === "ok" && (
                <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 gap-1">
                  <CheckCircle size={12} /> Em dia ({lastDays}d)
                </Badge>
              )}
              {health === "soon" && (
                <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-100 gap-1">
                  <Warning size={12} /> Próximo do intervalo ({lastDays}d)
                </Badge>
              )}
              {health === "overdue" && (
                <Badge className="bg-red-100 text-red-800 hover:bg-red-100 gap-1">
                  <Warning size={12} /> Atrasado ({lastDays}d)
                </Badge>
              )}
              {health === "never" && (
                <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100 gap-1">
                  <Warning size={12} /> Ainda sem cópia
                </Badge>
              )}
              <Badge variant="secondary" className="gap-1">
                <ShieldCheck size={12} /> Retenção {status.backup_retention_days} dias
              </Badge>
            </div>
            {lastSha256 && (
              <p className="text-xs text-slate-500 mt-2 font-mono">SHA-256 · {shortHash(lastSha256)}</p>
            )}
          </div>
          <Database size={36} className="text-blue-600 shrink-0 self-start sm:self-center" weight="duotone" />
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full bg-slate-100">
          <TabsTrigger value="fluxo" className="flex-1">Fluxo</TabsTrigger>
          <TabsTrigger value="copias" className="flex-1">Cópias no Storage</TabsTrigger>
          <TabsTrigger value="historico" className="flex-1">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="fluxo" className="mt-4 space-y-4">
          <Card className="border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-base">Como funciona</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-600">
              <p>
                O backup deste ecrã é a <strong>cópia do ambiente</strong> (cadastros, certificados, lista mestra, etc.),
                guardada no Storage privado com verificação SHA-256. É diferente do backup de infraestrutura do Supabase (PITR).
              </p>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1">1. Gerar</span>
                <ArrowRight size={12} />
                <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1">2. Verificar</span>
                <ArrowRight size={12} />
                <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1">3. Restaurar</span>
              </div>
            </CardContent>
          </Card>

          <FlowStep n="1" title="Gerar e guardar cópia" active>
            <p>
              Cria um ZIP completo, calcula integridade, grava no Storage e inicia o download.
              Guarde também uma cópia na rede da empresa (disponibilidade ALCOA+).
            </p>
            <p className="text-xs text-slate-500">
              Intervalo recomendado: a cada {status.auto_interval_days} dias. Cópias no Storage são purgadas após {status.backup_retention_days} dias.
            </p>
            <Button
              onClick={generateAndDownload}
              disabled={busy}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              data-testid="create-backup-btn"
            >
              <DownloadSimple size={16} className="mr-1.5" />
              {busy ? "A gerar…" : "Gerar e descarregar cópia"}
            </Button>
          </FlowStep>

          <FlowStep n="2" title="Verificar ZIP (dry-run — sem gravar)">
            <p>
              Analisa o ficheiro: confere o ambiente, a integridade SHA-256 e compara contagens com o estado atual.
              <strong> Não altera dados.</strong> Use sempre antes de um restore crítico.
            </p>
            <div className="space-y-2">
              <Label className="text-xs">Ficheiro .zip</Label>
              <input
                ref={dryRunInputRef}
                type="file"
                accept=".zip,application/zip"
                className="block w-full text-sm"
                onChange={(e) => {
                  setDryRunFile(e.target.files?.[0] || null);
                  setDryRunReport(null);
                }}
                data-testid="dry-run-file-input"
              />
              {dryRunFile && (
                <p className="text-xs text-slate-500">{dryRunFile.name}</p>
              )}
              <Button
                variant="outline"
                disabled={dryRunning || !dryRunFile}
                onClick={runDryRun}
                data-testid="dry-run-btn"
              >
                <MagnifyingGlass size={16} className="mr-1.5" />
                {dryRunning ? "A verificar…" : "Executar verificação"}
              </Button>
            </div>

            {dryRunReport && (
              <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50/80 p-3 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wider text-slate-500">Resultado</span>
                  {dryRunReport.integrity_verified ? (
                    <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Integridade OK</Badge>
                  ) : (
                    <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-100">Sem integrity v3</Badge>
                  )}
                  <span className="text-xs font-mono text-slate-500">{shortHash(dryRunReport.sha256)}</span>
                </div>
                <p className="text-sm text-slate-700">{formatDryRunSummary(dryRunReport)}</p>
                {dryRunReport.warnings?.length > 0 && (
                  <ul className="text-xs text-amber-900 list-disc pl-4">
                    {dryRunReport.warnings.map((w) => <li key={w}>{w}</li>)}
                  </ul>
                )}
                {topDeltas.length > 0 && (
                  <div className="overflow-x-auto border rounded-md bg-white">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 text-left text-[10px] uppercase text-slate-500">
                        <tr>
                          <th className="px-2 py-1">Tabela</th>
                          <th className="px-2 py-1">No ZIP</th>
                          <th className="px-2 py-1">No ambiente</th>
                          <th className="px-2 py-1">Diferença</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {topDeltas.map(([table, v]) => (
                          <tr key={table}>
                            <td className="px-2 py-1 font-mono">{table}</td>
                            <td className="px-2 py-1">{v.zip}</td>
                            <td className="px-2 py-1">{v.live ?? "—"}</td>
                            <td className="px-2 py-1">{v.delta > 0 ? `+${v.delta}` : v.delta}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </FlowStep>

          <FlowStep n="3" title="Restaurar no ambiente">
            <p>
              <strong>Acrescentar (merge)</strong> — importa o ZIP sem apagar o que já existe (novos IDs).
              {" "}
              <strong>Substituir</strong> — apaga os dados cobertos e repõe o ZIP; exige confirmação reforçada e gera automaticamente uma cópia de segurança antes.
            </p>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Ficheiro .zip</Label>
                <input
                  ref={restoreInputRef}
                  type="file"
                  accept=".zip,application/zip"
                  className="mt-1 block w-full text-sm"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  data-testid="restore-file-input"
                />
                {selectedFile && (
                  <p className="text-xs text-slate-500 mt-1">{selectedFile.name}</p>
                )}
              </div>

              <label className="flex items-start gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={replace}
                  onChange={(e) => setReplace(e.target.checked)}
                  data-testid="replace-checkbox"
                />
                <span>
                  <strong>Modo substituir</strong>
                  <span className="block text-xs text-slate-500">
                    Operação destrutiva. Requer digitar SUBSTITUIR e a senha do administrador.
                  </span>
                </span>
              </label>

              {replace && (
                <div className="rounded-md border border-amber-200 bg-amber-50/70 p-3 space-y-3">
                  <button
                    type="button"
                    className="text-xs text-amber-900 underline"
                    onClick={() => setOpenReplaceHelp(true)}
                  >
                    O que acontece no modo substituir?
                  </button>
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
                    <Label className="text-xs">Senha do administrador</Label>
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
                disabled={restoring || !selectedFile || (replace && !canReplace)}
                className={replace ? "bg-red-600 hover:bg-red-700 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"}
                data-testid="confirm-restore-btn"
              >
                <UploadSimple size={16} className="mr-1.5" />
                {restoring
                  ? "A restaurar…"
                  : replace
                    ? "Confirmar substituição"
                    : "Restaurar (acrescentar)"}
              </Button>
            </div>
          </FlowStep>
        </TabsContent>

        <TabsContent value="copias" className="mt-4">
          <Card className="border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-base">Cópias no Storage privado</CardTitle>
            </CardHeader>
            <CardContent>
              {!status.backups?.length ? (
                <div className="border border-dashed border-slate-200 rounded-lg p-10 text-center">
                  <HardDrives size={40} className="mx-auto text-slate-300" weight="duotone" />
                  <p className="font-display text-lg font-semibold text-slate-800 mt-3">Sem cópias listadas</p>
                  <p className="text-sm text-slate-600 mt-1">Gere uma cópia no separador Fluxo para a ver aqui.</p>
                </div>
              ) : (
                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 text-left text-[10px] uppercase text-slate-500">
                      <tr>
                        <th className="px-3 py-2">Ficheiro</th>
                        <th className="px-3 py-2">Criado</th>
                        <th className="px-3 py-2">Tamanho</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {status.backups.map((b) => (
                        <tr key={b.storage_path || b.name}>
                          <td className="px-3 py-2 font-mono truncate max-w-[320px]">{b.name}</td>
                          <td className="px-3 py-2 whitespace-nowrap">{formatDate(b.created_at)}</td>
                          <td className="px-3 py-2">
                            {b.size_bytes != null ? `${(b.size_bytes / (1024 * 1024)).toFixed(1)} MB` : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="historico" className="mt-4">
          <Card className="border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-base">Audit trail</CardTitle>
            </CardHeader>
            <CardContent>
              {!status.events?.length ? (
                <p className="text-sm text-slate-500">Ainda sem eventos registados neste ambiente.</p>
              ) : (
                <div className="overflow-x-auto border rounded-lg max-h-80 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 text-left text-[10px] uppercase text-slate-500 sticky top-0">
                      <tr>
                        <th className="px-3 py-2">Quando</th>
                        <th className="px-3 py-2">Ação</th>
                        <th className="px-3 py-2">Resultado</th>
                        <th className="px-3 py-2">Ator</th>
                        <th className="px-3 py-2">SHA-256</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {status.events.map((ev) => (
                        <tr key={ev.id}>
                          <td className="px-3 py-2 whitespace-nowrap">{formatDate(ev.created_at)}</td>
                          <td className="px-3 py-2">
                            {ACTION_LABEL[ev.action] || ev.action}
                            {ev.restore_mode ? ` · ${ev.restore_mode}` : ""}
                          </td>
                          <td className="px-3 py-2">
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
                          <td className="px-3 py-2 truncate max-w-[140px]">
                            {ev.actor_full_name || ev.actor_email || "—"}
                          </td>
                          <td className="px-3 py-2 font-mono">{ev.sha256 ? shortHash(ev.sha256) : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={openReplaceHelp} onOpenChange={setOpenReplaceHelp}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Modo substituir</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-slate-600 space-y-2">
            <p>1. Reautenticação com a sua senha de administrador.</p>
            <p>2. Geração automática de uma cópia <em>pre-replace</em> no Storage.</p>
            <p>3. Apagar os dados cobertos do ambiente atual.</p>
            <p>4. Importar o conteúdo do ZIP e registar o evento no audit trail.</p>
            <p className="text-xs text-slate-500">
              Preferir dry-run antes. Em produção, seguir o protocolo QI/QO em docs/11-BACKUP-DR-QIQO.md.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenReplaceHelp(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
