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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, MagnifyingGlass, Archive, FilePdf, EnvelopeSimple, Trash } from "@phosphor-icons/react";
import { toast } from "sonner";
import {
  WEIGHT_CERTIFICATE_NEW_PATH,
  weightCertificateEditorPath,
} from "@/lib/weightCalibration/weightCertificateRoutes";
import {
  listWeightCertificates,
  getWeightCertificate,
  bulkApproveWeightCertificates,
  markWeightCertificateObsolete,
  deleteWeightCertificate,
} from "@/lib/weightCalibration/weightCertificateApi";
import {
  certificateStatusLabel,
  certificateTypeLabel,
  formatCertificateNumber,
  CERTIFICATE_STATUSES,
  canMarkCertificateObsolete,
  canDeleteCertificate,
} from "@/lib/weightCalibration/weightCertificateSchema";
import { downloadWeightCertificatePdf } from "@/lib/weightCalibration/weightCertificateExport";
import {
  isZipDownloadableRow,
  downloadWeightCertificatesZip,
  buildWeightCertificatesZipFileName,
} from "@/lib/weightCalibration/weightCertificateBulkZipDownload";
import {
  resolveClientEmail,
  sendWeightCertificateByEmail,
} from "@/lib/weightCalibration/weightCertificateEmailApi";
import { loadTenantLogoDataUrl } from "@/lib/tenantBranding";
import { supabase } from "@/lib/supabaseClient";
import EllipsisTooltip from "@/components/ui/ellipsis-tooltip";
import CertificateObsoleteDialog from "@/components/calibrationCertificates/CertificateObsoleteDialog";
import CertificatePermanentDeleteDialog from "@/components/calibrationCertificates/CertificatePermanentDeleteDialog";

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

function isApprovableRow(row) {
  return row.status === "aguardando_aprovacao";
}

function isSendableRow(row) {
  return ["aprovado", "emitido", "enviado"].includes(row.status);
}

export default function WeightCertificateListPage({ embedded = false, approvalMode = false }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentTenantId, currentTenant } = useOutletContext();
  const [rows, setRows] = useState([]);
  const [endCustomers, setEndCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState(() => searchParams.get("status") || (approvalMode ? "aguardando_aprovacao" : "all"));
  const [query, setQuery] = useState("");
  const [logoDataUrl, setLogoDataUrl] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [batchBusy, setBatchBusy] = useState(false);
  const [batchProgress, setBatchProgress] = useState("");
  const [lifecycleRow, setLifecycleRow] = useState(null);
  const [obsoleteOpen, setObsoleteOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [lifecycleBusy, setLifecycleBusy] = useState(false);

  const canApprove = canApproveCalibrationCertificate(user?.role);
  const canSend = canSendCertificateEmail(user?.role) && !approvalMode;
  const canCreate = canEditCalibrationCertificate(user?.role) && !approvalMode;

  const load = useCallback(async () => {
    if (!currentTenantId) return;
    setLoading(true);
    try {
      const data = await listWeightCertificates(currentTenantId, {
        status: statusFilter,
        search: query,
      });
      setRows(data);
      setSelectedIds([]);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [currentTenantId, statusFilter, query]);

  useEffect(() => {
    const t = setTimeout(() => { load(); }, query ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, query]);

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

  const selectableIds = useMemo(() => {
    const ids = new Set();
    rows.filter(isApprovableRow).forEach((r) => ids.add(r.id));
    rows.filter(isZipDownloadableRow).forEach((r) => ids.add(r.id));
    return [...ids];
  }, [rows]);

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
    if (selectedIds.length && selectedIds.length === selectableIds.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(selectableIds);
    }
  };

  const handlePdf = async (row) => {
    try {
      const full = await getWeightCertificate(row.id);
      await downloadWeightCertificatePdf(full, currentTenant?.name || "", {
        logoDataUrl,
        tenant: currentTenant,
      });
    } catch (e) {
      toast.error(e.message);
    }
  };

  const handleEmail = async (row) => {
    if (!canSend) return toast.error("Sem permissão para enviar e-mail");
    try {
      const full = await getWeightCertificate(row.id);
      const resolved = resolveClientEmail(full, endCustomers);
      if (!resolved.email) {
        return toast.error("E-mail do cliente não cadastrado");
      }
      await sendWeightCertificateByEmail(full, {
        tenant: currentTenant,
        tenantName: currentTenant?.name || "",
        logoDataUrl,
        endCustomers,
      });
      toast.success(`Enviado para ${resolved.email}`);
      load();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const handleBulkZip = async () => {
    const ids = selectedIds.filter((id) => {
      const row = rows.find((r) => r.id === id);
      return row && isZipDownloadableRow(row);
    });
    if (!ids.length) return toast.error("Selecione certificados para o ZIP");
    setBatchBusy(true);
    setBatchProgress(`0/${ids.length}`);
    try {
      const result = await downloadWeightCertificatesZip({
        ids,
        loadCertificate: getWeightCertificate,
        tenant: currentTenant,
        tenantName: currentTenant?.name || "",
        logoDataUrl,
        zipFileName: buildWeightCertificatesZipFileName(),
        onProgress: ({ index, total }) => setBatchProgress(`${index}/${total}`),
      });
      toast.success(`ZIP: ${result.ok} PDF(s)${result.fail ? `, ${result.fail} falha(s)` : ""}`);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBatchBusy(false);
      setBatchProgress("");
    }
  };

  const handleBulkApprove = async () => {
    const ids = selectedIds.filter((id) => {
      const row = rows.find((r) => r.id === id);
      return row && isApprovableRow(row);
    });
    if (!ids.length) return toast.error("Nenhum certificado aguardando aprovação");
    if (!canApprove) return toast.error("Sem permissão para aprovar");
    setBatchBusy(true);
    try {
      const { approved } = await bulkApproveWeightCertificates(ids, user.id);
      toast.success(`${approved} certificado(s) aprovado(s)`);
      load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBatchBusy(false);
    }
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
      await markWeightCertificateObsolete(lifecycleRow.id, { userId: user.id, reason });
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
      await deleteWeightCertificate(lifecycleRow.id, { tenantId: currentTenantId });
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

  return (
    <div className="space-y-6 min-w-0" data-testid="weight-certificate-list">
      {!embedded && (
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">RE-5.4.2B</p>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mt-1">
              Certificados de pesos-padrão
            </h1>
          </div>
          {canCreate && (
            <Button asChild className="bg-blue-600 hover:bg-blue-700">
              <Link to={WEIGHT_CERTIFICATE_NEW_PATH}>
                <Plus size={18} className="mr-1" /> Nova
              </Link>
            </Button>
          )}
        </div>
      )}
      {embedded && canCreate && (
        <div className="flex justify-end">
          <Button asChild className="bg-blue-600 hover:bg-blue-700">
            <Link to={WEIGHT_CERTIFICATE_NEW_PATH}>
              <Plus size={18} className="mr-1" /> Nova
            </Link>
          </Button>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4 shadow-sm flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative min-w-0 flex-1">
          <MagnifyingGlass
            size={18}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por cliente, tag, nº…"
            className="h-10 pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-10 w-full sm:w-[14rem]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {CERTIFICATE_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedIds.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <span className="text-sm text-slate-600">{selectedIds.length} selecionado(s)</span>
          <Button type="button" size="sm" variant="outline" disabled={batchBusy} onClick={handleBulkZip}>
            <Archive size={14} className="mr-1" />
            {batchBusy && batchProgress ? `ZIP ${batchProgress}` : "Baixar ZIP"}
          </Button>
          {canApprove && selectedIds.some((id) => isApprovableRow(rows.find((r) => r.id === id))) && (
            <Button type="button" size="sm" variant="outline" disabled={batchBusy} onClick={handleBulkApprove}>
              Aprovar em lote
            </Button>
          )}
          <Button type="button" size="sm" variant="ghost" onClick={() => setSelectedIds([])}>
            Limpar
          </Button>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-slate-500 py-8 text-center">A carregar…</p>
      ) : rows.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-slate-50">
          <p className="text-slate-600">Nenhum certificado encontrado.</p>
          {canCreate && (
            <Button asChild className="mt-4 bg-blue-600 hover:bg-blue-700">
              <Link to={WEIGHT_CERTIFICATE_NEW_PATH}>Criar primeiro certificado</Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="p-3 w-10">
                  <Checkbox
                    checked={selectableIds.length > 0 && selectedIds.length === selectableIds.length}
                    onCheckedChange={toggleSelectAll}
                  />
                </th>
                <th className="text-left p-3 font-medium">Nº</th>
                <th className="text-left p-3 font-medium">Cliente</th>
                <th className="text-left p-3 font-medium">Tag</th>
                <th className="text-left p-3 font-medium">Tipo</th>
                <th className="text-left p-3 font-medium">Data</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="p-3 w-36" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b last:border-0 hover:bg-slate-50/50">
                  <td className="p-3">
                    {selectableIds.includes(row.id) && (
                      <Checkbox
                        checked={selectedIds.includes(row.id)}
                        onCheckedChange={() => toggleSelect(row.id)}
                      />
                    )}
                  </td>
                  <td className="p-3 font-mono text-xs">
                    {formatCertificateNumber(row.certificate_number, row.certificate_year)}
                    {row.is_preview_only && (
                      <Badge className="ml-1 bg-amber-100 text-amber-800 text-[9px]">Prévia</Badge>
                    )}
                  </td>
                  <td className="p-3 max-w-[140px]">
                    <EllipsisTooltip label={row.client_name || ""} className="block">
                      {row.client_name || "—"}
                    </EllipsisTooltip>
                  </td>
                  <td className="p-3 font-mono text-xs">{row.weight_tag || "—"}</td>
                  <td className="p-3 text-xs">{certificateTypeLabel(row.certificate_type)}</td>
                  <td className="p-3">{fmtDmy(row.calibration_date)}</td>
                  <td className="p-3">
                    <Badge className={`text-[10px] font-normal ${statusTone[row.status] || "bg-slate-100"}`}>
                      {certificateStatusLabel(row.status)}
                    </Badge>
                  </td>
                  <td className="p-3">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(weightCertificateEditorPath(row.id))}
                      >
                        Abrir
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handlePdf(row)} title="PDF">
                        <FilePdf size={16} />
                      </Button>
                      {canSend && isSendableRow(row) && (
                        <Button variant="ghost" size="sm" onClick={() => handleEmail(row)} title="E-mail">
                          <EnvelopeSimple size={16} />
                        </Button>
                      )}
                      {canCreate && canMarkCertificateObsolete(row.status) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-amber-700 hover:text-amber-900 hover:bg-amber-50"
                          onClick={() => openObsolete(row)}
                          title="Marcar obsoleto"
                        >
                          <Archive size={16} />
                        </Button>
                      )}
                      {canCreate && canDeleteCertificate(row.status) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-800 hover:bg-red-50"
                          onClick={() => openDelete(row)}
                          title="Remover permanentemente"
                        >
                          <Trash size={16} />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
