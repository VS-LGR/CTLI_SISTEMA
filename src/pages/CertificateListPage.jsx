import React, { useCallback, useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useOutletContext } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { isSupabaseAuthMode } from "@/lib/api";
import { canAccessCalibrationCertificates } from "@/lib/roles";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, PencilSimple, FilePdf, Calculator, MagnifyingGlass, Archive, Trash } from "@phosphor-icons/react";
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
} from "@/lib/calibrationCertificates/certificateApi";
import {
  certificateStatusLabel,
  certificateTypeLabel,
  formatCertificateNumber,
  isCertificateEditable,
  canMarkCertificateObsolete,
  canDeleteCertificate,
} from "@/lib/calibrationCertificates/certificateSchema";
import CertificateObsoleteDialog from "@/components/calibrationCertificates/CertificateObsoleteDialog";
import CertificatePermanentDeleteDialog from "@/components/calibrationCertificates/CertificatePermanentDeleteDialog";
import { exportCertificatePdfPreview } from "@/lib/certificateExport";
import CertificateCalculationsHelp from "@/components/calibrationCertificates/CertificateCalculationsHelp";
import { TENANT_BRANDING_BUCKET } from "@/lib/tenantBranding";
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
  substituido: "bg-slate-200 text-slate-600",
  cancelado: "bg-red-100 text-red-800",
  obsoleto: "bg-amber-100 text-amber-900",
  reprovado: "bg-red-100 text-red-700",
};

export default function CertificateListPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { currentTenantId, currentTenant } = useOutletContext();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [logoDataUrl, setLogoDataUrl] = useState(null);
  const [lifecycleRow, setLifecycleRow] = useState(null);
  const [obsoleteOpen, setObsoleteOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [lifecycleBusy, setLifecycleBusy] = useState(false);

  const load = useCallback(async () => {
    if (!currentTenantId) return;
    setLoading(true);
    try {
      const data = await listCertificates(currentTenantId, { status: statusFilter });
      setRows(data);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [currentTenantId, statusFilter]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const path = currentTenant?.logo_storage_path;
    if (!path) return;
    supabase.storage.from(TENANT_BRANDING_BUCKET).createSignedUrl(path, 3600).then(({ data }) => {
      if (data?.signedUrl) setLogoDataUrl(data.signedUrl);
    });
  }, [currentTenant?.logo_storage_path]);

  if (!canAccessCalibrationCertificates(user?.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  if (!isSupabaseAuthMode || !currentTenantId) {
    return <p className="text-sm text-slate-500 p-8">Ligação Supabase necessária.</p>;
  }

  const filtered = rows.filter((r) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return [r.client_name, r.scale_serial, String(r.certificate_number)].some(
      (f) => String(f || "").toLowerCase().includes(q),
    );
  });

  const handlePreview = async (row) => {
    try {
      const { getCertificate } = await import("@/lib/calibrationCertificates/certificateApi");
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

  return (
    <div className="space-y-6 max-w-6xl w-full min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-xl font-semibold text-slate-900">Certificados de Calibração</h1>
          <p className="text-sm text-slate-500 mt-1">RE-7.2B — emissão manual ou importação opcional da coleta RE-7.2A</p>
        </div>
        <Button asChild>
          <Link to={CERTIFICATE_NEW_PATH}><Plus size={18} className="mr-1" /> Novo certificado</Link>
        </Button>
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
            <SelectItem value="cancelado">Cancelado</SelectItem>
            <SelectItem value="obsoleto">Obsoleto</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="border-slate-200 overflow-hidden">
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="p-3">Nº Certificado</th>
                <th className="p-3">Emissão</th>
                <th className="p-3">Vencimento</th>
                <th className="p-3">Cliente</th>
                <th className="p-3">Responsável</th>
                <th className="p-3">Série</th>
                <th className="p-3">Tipo</th>
                <th className="p-3">Status</th>
                <th className="p-3">Obs.</th>
                <th className="p-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} className="p-8 text-center text-slate-500">A carregar…</td></tr>
              ) : !filtered.length ? (
                <tr><td colSpan={10} className="p-8 text-center text-slate-500">Nenhum certificado encontrado.</td></tr>
              ) : filtered.map((r) => (
                <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50/50">
                  <td className="p-3 font-medium">{formatCertificateNumber(r.certificate_number, r.certificate_year)}</td>
                  <td className="p-3">{fmtDmy(r.issue_date || r.approval_date)}</td>
                  <td className="p-3">{fmtDmy(r.validity_date)}</td>
                  <td className="p-3">{r.client_name || "—"}</td>
                  <td className="p-3">{r.executor_name || "—"}</td>
                  <td className="p-3">{r.scale_serial || "—"}</td>
                  <td className="p-3">{certificateTypeLabel(r.certificate_type)}</td>
                  <td className="p-3">
                    <Badge className={statusTone[r.status] || "bg-slate-100"}>
                      {certificateStatusLabel(r.status)}
                    </Badge>
                  </td>
                  <td className="p-3 max-w-[140px] truncate text-slate-600" title={r.approval_notes || ""}>
                    {r.approval_notes || "—"}
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      <Button variant="ghost" size="sm" onClick={() => navigate(certificateEditorPath(r.id))}>
                        <PencilSimple size={16} />
                      </Button>
                      {isCertificateEditable(r.status) && (
                        <>
                          <Button variant="ghost" size="sm" onClick={() => handleRecalc(r)} title="Recalcular">
                            <Calculator size={16} />
                          </Button>
                          <CertificateCalculationsHelp iconOnly />
                        </>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => handlePreview(r)} title="Prévia PDF">
                        <FilePdf size={16} />
                      </Button>
                      {canMarkCertificateObsolete(r.status) && (
                        <Button variant="ghost" size="sm" className="text-amber-700" onClick={() => openObsolete(r)} title="Marcar obsoleto">
                          <Archive size={16} />
                        </Button>
                      )}
                      {canDeleteCertificate(r.status) && (
                        <Button variant="ghost" size="sm" className="text-red-600" onClick={() => openDelete(r)} title="Remover permanentemente">
                          <Trash size={16} />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

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
