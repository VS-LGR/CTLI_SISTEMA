import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useOutletContext, useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { isSupabaseAuthMode } from "@/lib/api";
import {
  canAccessCalibrationCertificates,
  canApproveCalibrationCertificate,
  canSendCertificateEmail,
  canEditCalibrationCertificate,
} from "@/lib/roles";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, MagnifyingGlass, Archive, PaperPlaneTilt } from "@phosphor-icons/react";
import { toast } from "sonner";
import {
  CERTIFICATE_NEW_PATH,
  certificateEditorPath,
} from "@/lib/certificateRoutes";
import {
  listCertificates,
  recalculateCertificate,
  markCertificateObsolete,
  deleteCertificate,
  bulkApproveCertificates,
  getCertificate,
} from "@/lib/calibrationCertificates/certificateApi";
import {
  certificateStatusLabel,
  certificateTypeLabel,
  formatCertificateNumber,
} from "@/lib/calibrationCertificates/certificateSchema";
import CertificateObsoleteDialog from "@/components/calibrationCertificates/CertificateObsoleteDialog";
import CertificatePermanentDeleteDialog from "@/components/calibrationCertificates/CertificatePermanentDeleteDialog";
import CertificateBulkActionBar from "@/components/calibrationCertificates/CertificateBulkActionBar";
import CertificateRowActions from "@/components/calibrationCertificates/CertificateRowActions";
import CertificateEmitSendDialog from "@/components/calibrationCertificates/CertificateEmitSendDialog";
import { exportCertificatePdfPreview } from "@/lib/certificateExport";
import { sendCertificatesByEmailBatch } from "@/lib/certificateEmail/certificateEmailApi";
import {
  buildCertificatesZipFileName,
  certificateMatchesClient,
  collectDownloadableCertificateIdsForClient,
  collectEmailableCertificateIdsForClient,
  downloadCertificatesZip,
  isZipDownloadableRow,
  isZipEmailableRow,
} from "@/lib/calibrationCertificates/certificateBulkZipDownload";
import { sendCertificatesZipByEmail } from "@/lib/calibrationCertificates/certificateBulkZipEmail";
import EllipsisTooltip from "@/components/ui/ellipsis-tooltip";
import { loadTenantLogoDataUrl } from "@/lib/tenantBranding";
import { supabase } from "@/lib/supabaseClient";
import { Input } from "@/components/ui/input";

function fmtDmy(iso) {
  if (!iso) return "—";
  const [y, m, d] = String(iso).split("-");
  return y && m && d ? `${d}/${m}/${y}` : iso;
}

const statusTone = {
  rascunho: "bg-slate-100 text-slate-700",
  calculado: "bg-blue-100 text-blue-800",
  em_revisao_tecnica: "bg-amber-100 text-amber-800",
  aguardando_aprovacao: "bg-orange-100 text-orange-800",
  aprovado: "bg-emerald-100 text-emerald-800",
  emitido: "bg-emerald-200 text-emerald-900",
  enviado: "bg-blue-100 text-blue-900",
  substituido: "bg-slate-200 text-slate-600",
  cancelado: "bg-red-100 text-red-800",
  obsoleto: "bg-amber-100 text-amber-900",
  reprovado: "bg-red-100 text-red-700",
};

function isSendableRow(row) {
  return ["aprovado", "emitido", "enviado"].includes(row.status);
}

function isApprovableRow(row) {
  return row.status === "aguardando_aprovacao";
}

export default function CertificateListPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentTenantId, currentTenant } = useOutletContext();
  const [rows, setRows] = useState([]);
  const [endCustomers, setEndCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState(() => searchParams.get("status") || "all");
  const [emailFilter, setEmailFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [logoDataUrl, setLogoDataUrl] = useState(null);
  const [lifecycleRow, setLifecycleRow] = useState(null);
  const [obsoleteOpen, setObsoleteOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [lifecycleBusy, setLifecycleBusy] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [batchBusy, setBatchBusy] = useState(false);
  const [batchProgress, setBatchProgress] = useState("");
  const [emitSendOpen, setEmitSendOpen] = useState(false);
  const [approvedForSendIds, setApprovedForSendIds] = useState([]);
  const [downloadClientId, setDownloadClientId] = useState("");

  const canApprove = canApproveCalibrationCertificate(user?.role);
  const canSend = canSendCertificateEmail(user?.role);
  const canCreate = canEditCalibrationCertificate(user?.role);

  const load = useCallback(async () => {
    if (!currentTenantId) return;
    setLoading(true);
    try {
      const data = await listCertificates(currentTenantId, { status: statusFilter });
      setRows(data);
      setSelectedIds([]);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [currentTenantId, statusFilter]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!currentTenantId) return;
    supabase
      .from("end_customer_registrations")
      .select("id, email, name")
      .eq("tenant_id", currentTenantId)
      .then(({ data }) => setEndCustomers(data || []));
  }, [currentTenantId]);

  useEffect(() => {
    let cancelled = false;
    loadTenantLogoDataUrl(currentTenant).then((dataUrl) => {
      if (!cancelled) setLogoDataUrl(dataUrl);
    });
    return () => { cancelled = true; };
  }, [currentTenant]);

  const filtered = useMemo(() => rows.filter((r) => {
    const q = query.trim().toLowerCase();
    if (q && ![r.client_name, r.scale_serial, String(r.certificate_number)].some(
      (f) => String(f || "").toLowerCase().includes(q),
    )) return false;
    if (emailFilter === "not_sent" && (r.client_email_sent_at || r.status === "enviado")) return false;
    if (emailFilter === "sent" && !r.client_email_sent_at && r.status !== "enviado") return false;
    return true;
  }), [rows, query, emailFilter]);

  const selectableIds = useMemo(() => {
    const ids = new Set();
    const approvalMode =
      statusFilter === "aguardando_aprovacao" || (canApprove && filtered.some(isApprovableRow));
    if (approvalMode) {
      filtered.filter(isApprovableRow).forEach((r) => ids.add(r.id));
    }
    filtered.filter(isZipDownloadableRow).forEach((r) => ids.add(r.id));
    if (canSend) {
      filtered.filter(isSendableRow).forEach((r) => ids.add(r.id));
    }
    return [...ids];
  }, [filtered, statusFilter, canApprove, canSend]);

  const sortedEndCustomers = useMemo(
    () => [...endCustomers].sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "pt")),
    [endCustomers],
  );

  if (!canAccessCalibrationCertificates(user?.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  if (!isSupabaseAuthMode || !currentTenantId) {
    return <p className="text-sm text-slate-500 p-8">Ligação Supabase necessária.</p>;
  }

  const toggleSelect = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === selectableIds.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(selectableIds);
    }
  };

  const handlePreview = async (row) => {
    try {
      const full = await getCertificate(row.id);
      await exportCertificatePdfPreview(full, currentTenant?.name || "", {
        logoDataUrl,
        tenant: currentTenant,
      });
    } catch (e) {
      toast.error(e.message);
    }
  };

  const handleRecalc = async (row) => {
    try {
      await recalculateCertificate(row.id);
      toast.success("Cálculos atualizados");
      load();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const runBulkSend = async (ids) => {
    if (!ids.length) return;
    setBatchBusy(true);
    setBatchProgress(`0/${ids.length}`);
    try {
      const results = await sendCertificatesByEmailBatch(ids, {
        loadCertificate: getCertificate,
        tenant: currentTenant,
        tenantName: currentTenant?.name || "",
        logoDataUrl,
        endCustomers,
        onProgress: ({ index, total }) => setBatchProgress(`${index}/${total}`),
      });
      const ok = results.filter((r) => r.ok).length;
      const fail = results.length - ok;
      if (ok) toast.success(`${ok} certificado(s) enviado(s)`);
      if (fail) toast.error(`${fail} falha(s) no envio`);
      load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBatchBusy(false);
      setBatchProgress("");
      setEmitSendOpen(false);
      setApprovedForSendIds([]);
    }
  };

  const handleBulkApprove = async () => {
    const ids = selectedIds.filter((id) => {
      const row = rows.find((r) => r.id === id);
      return row && isApprovableRow(row);
    });
    if (!ids.length) return toast.error("Selecione certificados aguardando aprovação");
    setBatchBusy(true);
    try {
      const { approved } = await bulkApproveCertificates(ids, { userId: user.id });
      toast.success(`${approved} certificado(s) aprovado(s)`);
      await load();
      if (canSend && approved > 0) {
        setApprovedForSendIds(ids.slice(0, approved));
        setEmitSendOpen(true);
      }
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBatchBusy(false);
    }
  };

  const handleBulkSend = async () => {
    const ids = selectedIds.filter((id) => {
      const row = rows.find((r) => r.id === id);
      return row && isSendableRow(row);
    });
    if (!ids.length) return toast.error("Selecione certificados aprovados ou emitidos");
    if (!window.confirm(`Emitir e enviar ${ids.length} certificado(s) por e-mail?`)) return;
    await runBulkSend(ids);
  };

  const runBulkZipDownload = async (ids, zipFileName) => {
    if (!ids.length) return;
    setBatchBusy(true);
    setBatchProgress(`0/${ids.length}`);
    try {
      const { ok, fail } = await downloadCertificatesZip({
        ids,
        loadCertificate: getCertificate,
        tenant: currentTenant,
        tenantName: currentTenant?.name || "",
        logoDataUrl,
        zipFileName,
        onProgress: ({ index, total }) => setBatchProgress(`${index}/${total}`),
      });
      if (ok) toast.success(`${ok} certificado(s) no ZIP`);
      if (fail) toast.error(`${fail} falha(s) na geração do PDF`);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBatchBusy(false);
      setBatchProgress("");
    }
  };

  const handleBulkDownloadZip = async () => {
    const ids = selectedIds.filter((id) => {
      const row = rows.find((r) => r.id === id);
      return row && isZipDownloadableRow(row);
    });
    if (!ids.length) {
      return toast.error("Selecione ao menos um certificado com PDF gerável");
    }
    await runBulkZipDownload(ids, buildCertificatesZipFileName());
  };

  const resolveClientZipIds = async (customer, { forEmail = false } = {}) => {
    const all = await listCertificates(currentTenantId, { status: "all" });
    const collect = forEmail
      ? collectEmailableCertificateIdsForClient
      : collectDownloadableCertificateIdsForClient;
    return {
      ids: collect(all, customer),
      totalForClient: all.filter((r) => certificateMatchesClient(r, customer)).length,
    };
  };

  const handleClientDownloadZip = async () => {
    if (!downloadClientId) return toast.error("Selecione um cliente");
    const customer = endCustomers.find((c) => c.id === downloadClientId);
    if (!customer) return toast.error("Cliente não encontrado");

    setBatchBusy(true);
    setBatchProgress("A carregar…");
    let ids = [];
    try {
      const resolved = await resolveClientZipIds(customer);
      ids = resolved.ids;
      if (!ids.length) {
        toast.error("Nenhum certificado baixável para este cliente");
        return;
      }
      toast.info(`${ids.length} de ${resolved.totalForClient} certificado(s) de ${customer.name} no ZIP`);
    } catch (e) {
      toast.error(e.message);
      return;
    } finally {
      setBatchBusy(false);
      setBatchProgress("");
    }

    await runBulkZipDownload(
      ids,
      buildCertificatesZipFileName({ clientName: customer.name }),
    );
  };

  const runBulkZipEmail = async (ids, { clientName = null } = {}) => {
    if (!ids.length) return;
    setBatchBusy(true);
    setBatchProgress(`0/${ids.length}`);
    try {
      const result = await sendCertificatesZipByEmail({
        ids,
        loadCertificate: getCertificate,
        tenant: currentTenant,
        tenantName: currentTenant?.name || "",
        logoDataUrl,
        endCustomers,
        clientName,
        onProgress: ({ index, total, phase }) => {
          const label = phase === "send" ? "A enviar…" : `${index}/${total}`;
          setBatchProgress(label);
        },
      });
      toast.success(`ZIP enviado para ${result.recipient} (${result.count} certificado(s))`);
      load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBatchBusy(false);
      setBatchProgress("");
    }
  };

  const handleBulkSendZipEmail = async () => {
    const ids = selectedIds.filter((id) => {
      const row = rows.find((r) => r.id === id);
      return row && isZipEmailableRow(row);
    });
    if (!ids.length) {
      return toast.error("Selecione certificados aprovados, emitidos ou enviados");
    }
    if (!window.confirm(
      `Gerar ZIP e enviar ${ids.length} certificado(s) por e-mail ao cliente? Os registros passarão a “enviado”.`,
    )) return;
    await runBulkZipEmail(ids);
  };

  const handleClientSendZipEmail = async () => {
    if (!downloadClientId) return toast.error("Selecione um cliente");
    const customer = endCustomers.find((c) => c.id === downloadClientId);
    if (!customer) return toast.error("Cliente não encontrado");
    if (!customer.email) {
      return toast.error("Cliente sem e-mail cadastrado. Atualize em Cadastros → Clientes.");
    }

    setBatchBusy(true);
    setBatchProgress("A carregar…");
    let ids = [];
    try {
      const resolved = await resolveClientZipIds(customer, { forEmail: true });
      ids = resolved.ids;
    } catch (e) {
      toast.error(e.message);
      setBatchBusy(false);
      setBatchProgress("");
      return;
    }
    setBatchBusy(false);
    setBatchProgress("");

    if (!ids.length) {
      return toast.error("Nenhum certificado aprovado/emitido/enviado para este cliente");
    }
    if (!window.confirm(
      `Enviar ZIP com ${ids.length} certificado(s) de ${customer.name} para ${customer.email}?`,
    )) return;
    await runBulkZipEmail(ids, { clientName: customer.name });
  };

  const handleSingleSend = async (row) => {
    if (!window.confirm(`Enviar certificado ${formatCertificateNumber(row.certificate_number, row.certificate_year)} por e-mail?`)) return;
    await runBulkSend([row.id]);
  };

  const openObsolete = (row) => {
    setLifecycleRow(row);
    setObsoleteOpen(true);
  };

  const openDelete = (row) => {
    setLifecycleRow(row);
    setDeleteOpen(true);
  };

  const handleMarkObsolete = async (reason) => {
    if (!lifecycleRow) return;
    setLifecycleBusy(true);
    try {
      await markCertificateObsolete(lifecycleRow.id, { userId: user.id, reason });
      toast.success("Certificado marcado como obsoleto");
      setObsoleteOpen(false);
      setLifecycleRow(null);
      load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLifecycleBusy(false);
    }
  };

  const handlePermanentDelete = async () => {
    if (!lifecycleRow) return;
    setLifecycleBusy(true);
    try {
      await deleteCertificate(lifecycleRow.id, { tenantId: currentTenantId });
      toast.success("Certificado removido permanentemente");
      setDeleteOpen(false);
      setLifecycleRow(null);
      load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLifecycleBusy(false);
    }
  };

  const lifecycleLabel = lifecycleRow
    ? formatCertificateNumber(lifecycleRow.certificate_number, lifecycleRow.certificate_year)
    : "";

  const showApprovalBar = canApprove && (statusFilter === "aguardando_aprovacao" || filtered.some(isApprovableRow));

  return (
    <div className="space-y-6 max-w-6xl w-full min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-xl font-semibold text-slate-900">Certificados de Calibração</h1>
          <p className="text-sm text-slate-500 mt-1">RE-7.2B — aprovação, emissão e envio ao cliente</p>
        </div>
        {canCreate && (
          <Button asChild>
            <Link to={CERTIFICATE_NEW_PATH}><Plus size={18} className="mr-1" /> Novo certificado</Link>
          </Button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            className="pl-9 h-10"
            placeholder="Buscar cliente, série ou número…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48 h-10"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="rascunho">Rascunho</SelectItem>
            <SelectItem value="calculado">Calculado</SelectItem>
            <SelectItem value="aguardando_aprovacao">Aguardando aprovação</SelectItem>
            <SelectItem value="aprovado">Aprovado</SelectItem>
            <SelectItem value="emitido">Emitido</SelectItem>
            <SelectItem value="enviado">Enviado ao cliente</SelectItem>
            <SelectItem value="cancelado">Cancelado</SelectItem>
            <SelectItem value="obsoleto">Obsoleto</SelectItem>
          </SelectContent>
        </Select>
        <Select value={emailFilter} onValueChange={setEmailFilter}>
          <SelectTrigger className="w-full sm:w-44 h-10"><SelectValue placeholder="E-mail" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="not_sent">Não enviados</SelectItem>
            <SelectItem value="sent">Já enviados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center flex-wrap">
        <Select
          value={downloadClientId || undefined}
          onValueChange={setDownloadClientId}
          disabled={batchBusy}
        >
          <SelectTrigger className="w-full sm:w-72 h-10">
            <SelectValue placeholder="Cliente para lote (ZIP)" />
          </SelectTrigger>
          <SelectContent>
            {sortedEndCustomers.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name || "Sem nome"}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="outline"
          className="h-10 shrink-0"
          onClick={handleClientDownloadZip}
          disabled={batchBusy || !downloadClientId}
        >
          <Archive size={16} className="mr-1" />
          Baixar ZIP do cliente
        </Button>
        {canSend && (
          <Button
            type="button"
            variant="outline"
            className="h-10 shrink-0"
            onClick={handleClientSendZipEmail}
            disabled={batchBusy || !downloadClientId}
          >
            <PaperPlaneTilt size={16} className="mr-1" />
            Enviar ZIP do cliente
          </Button>
        )}
      </div>

      <CertificateBulkActionBar
        selectedCount={selectedIds.length}
        totalSelectable={selectableIds.length}
        allSelected={selectableIds.length > 0 && selectedIds.length === selectableIds.length}
        onToggleAll={toggleSelectAll}
        onApprove={showApprovalBar ? handleBulkApprove : undefined}
        onSendEmail={canSend ? handleBulkSend : undefined}
        onDownloadZip={handleBulkDownloadZip}
        onSendZipEmail={canSend ? handleBulkSendZipEmail : undefined}
        canApprove={showApprovalBar}
        canSend={canSend}
        canDownloadZip
        busy={batchBusy}
      />
      {batchProgress && (
        <p className="text-xs text-slate-600">Progresso: {batchProgress}</p>
      )}

      <Card className="border-slate-200 overflow-hidden">
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm min-w-[1100px]">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="p-3 w-10" />
                <th className="p-3">Nº Certificado</th>
                <th className="p-3">Emissão</th>
                <th className="p-3">Vencimento</th>
                <th className="p-3">Cliente</th>
                <th className="p-3">Responsável</th>
                <th className="p-3">Série</th>
                <th className="p-3">Tipo</th>
                <th className="p-3">Status</th>
                <th className="p-3">E-mail</th>
                <th className="p-3 sticky right-0 z-20 bg-slate-50 min-w-[11.5rem] shadow-[-6px_0_8px_-6px_rgba(15,23,42,0.18)]">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={11} className="p-8 text-center text-slate-500">A carregar…</td></tr>
              ) : !filtered.length ? (
                <tr><td colSpan={11} className="p-8 text-center text-slate-500">Nenhum certificado encontrado.</td></tr>
              ) : filtered.map((r) => {
                const selectable = selectableIds.includes(r.id);
                return (
                  <tr key={r.id} className="group border-t border-slate-100 hover:bg-slate-50/50">
                    <td className="p-3 align-middle">
                      {selectable && (
                        <Checkbox
                          checked={selectedIds.includes(r.id)}
                          onCheckedChange={() => toggleSelect(r.id)}
                          disabled={batchBusy}
                        />
                      )}
                    </td>
                    <td className="p-3 font-medium">{formatCertificateNumber(r.certificate_number, r.certificate_year)}</td>
                    <td className="p-3">{fmtDmy(r.issue_date || r.approval_date)}</td>
                    <td className="p-3">{fmtDmy(r.validity_date)}</td>
                    <td className="p-3 max-w-[140px]">
                      <EllipsisTooltip label={r.client_name || ""} className="block">
                        {r.client_name || "—"}
                      </EllipsisTooltip>
                    </td>
                    <td className="p-3">{r.executor_name || "—"}</td>
                    <td className="p-3 max-w-[100px] font-mono text-xs">
                      <EllipsisTooltip label={r.scale_serial || ""} className="block">
                        {r.scale_serial || "—"}
                      </EllipsisTooltip>
                    </td>
                    <td className="p-3">{certificateTypeLabel(r.certificate_type)}</td>
                    <td className="p-3">
                      <Badge className={statusTone[r.status] || "bg-slate-100"}>
                        {certificateStatusLabel(r.status)}
                      </Badge>
                    </td>
                    <td className="p-3 text-xs text-slate-600 max-w-[120px]">
                      <EllipsisTooltip label={r.client_email_sent_to || ""} className="block">
                        {r.client_email_sent_to || (r.status === "enviado" ? "—" : "Não enviado")}
                      </EllipsisTooltip>
                    </td>
                    <td className="p-3 sticky right-0 z-10 bg-white group-hover:bg-slate-50/80 min-w-[11.5rem] shadow-[-6px_0_8px_-6px_rgba(15,23,42,0.12)]">
                      <CertificateRowActions
                        row={r}
                        canSend={canSend}
                        busy={batchBusy}
                        onEdit={() => navigate(certificateEditorPath(r.id))}
                        onRecalc={() => handleRecalc(r)}
                        onPreview={() => handlePreview(r)}
                        onSendEmail={() => handleSingleSend(r)}
                        onObsolete={() => openObsolete(r)}
                        onDelete={() => openDelete(r)}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <CertificateEmitSendDialog
        open={emitSendOpen}
        onOpenChange={setEmitSendOpen}
        count={approvedForSendIds.length || 1}
        clientEmail=""
        onEmitAndSend={() => runBulkSend(approvedForSendIds)}
        onSkip={() => {
          setEmitSendOpen(false);
          setApprovedForSendIds([]);
        }}
        busy={batchBusy}
      />

      <CertificateObsoleteDialog
        open={obsoleteOpen}
        onOpenChange={(open) => {
          setObsoleteOpen(open);
          if (!open) setLifecycleRow(null);
        }}
        certificateLabel={lifecycleLabel}
        onConfirm={handleMarkObsolete}
        busy={lifecycleBusy}
      />
      <CertificatePermanentDeleteDialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open);
          if (!open) setLifecycleRow(null);
        }}
        certificateLabel={lifecycleLabel}
        onConfirm={handlePermanentDelete}
        busy={lifecycleBusy}
      />
    </div>
  );
}
