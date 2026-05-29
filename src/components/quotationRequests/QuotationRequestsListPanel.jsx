import React, { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { isSupabaseAuthMode } from "@/lib/api";
import { canAccessQuotationRequests } from "@/lib/roles";
import {
  listQuotationRequests,
  deleteQuotationRequest,
  duplicateQuotationRequest,
  transitionQuotationStatus,
  getQuotationRequest,
} from "@/lib/quotationRequestsApi";
import { useQuotationCadastroData } from "@/hooks/useQuotationCadastroData";
import QuotationRequestStatusPanel from "@/components/quotationRequests/QuotationRequestStatusPanel";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { exportQuotationRequestPdf } from "@/lib/quotationRequestsExport";
import { QUOTATION_NEW_PATH, quotationEditorPath } from "@/lib/quotationRequestsRoutes";
import {
  QUOTATION_REQUEST_TYPES,
  QUOTATION_REQUEST_STATUSES,
  statusLabel,
} from "@/lib/quotationRequestTypes";
import { formatRequestNumber } from "@/lib/quotationRequestDisplay";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, CaretDown, PencilSimple, Trash, FilePdf, Copy, ArrowsClockwise } from "@phosphor-icons/react";
import { toast } from "sonner";
import { TENANT_BRANDING_BUCKET } from "@/lib/tenantBranding";
import { supabase } from "@/lib/supabaseClient";

async function loadLogoDataUrl(tenant) {
  if (!tenant?.logo_storage_path) return null;
  const { data } = await supabase.storage.from(TENANT_BRANDING_BUCKET).createSignedUrl(tenant.logo_storage_path, 3600);
  if (!data?.signedUrl) return null;
  const res = await fetch(data.signedUrl);
  const blob = await res.blob();
  return new Promise((resolve) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.readAsDataURL(blob);
  });
}

export default function QuotationRequestsListPanel({ tenantId, tenant }) {
  const { user } = useAuth();
  const nav = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    type: "all",
    status: "all",
    year: String(new Date().getFullYear()),
    supplierId: "",
  });
  const [statusDialogRow, setStatusDialogRow] = useState(null);
  const [statusChanging, setStatusChanging] = useState(false);
  const cadastro = useQuotationCadastroData(tenantId);

  const load = useCallback(async () => {
    if (!tenantId || !isSupabaseAuthMode) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await listQuotationRequests(tenantId, {
        type: filters.type,
        status: filters.status,
        year: filters.year ? Number(filters.year) : undefined,
        supplierId: filters.supplierId || undefined,
      });
      setRows(data);
    } catch (e) {
      toast.error(e.message || "Falha ao carregar solicitações");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [tenantId, filters]);

  useEffect(() => { load(); }, [load]);

  if (!canAccessQuotationRequests(user?.role)) {
    return <div className="text-slate-600 text-sm">Sem permissão para solicitações de orçamento.</div>;
  }
  if (!isSupabaseAuthMode) {
    return <div className="text-slate-600 text-sm">Solicitações de orçamento requerem modo Supabase.</div>;
  }
  if (!tenantId) {
    return <div className="text-slate-600 text-sm">Selecione um ambiente no topo.</div>;
  }

  const exportPdf = async (row) => {
    try {
      const logoDataUrl = await loadLogoDataUrl(tenant);
      const full = await getQuotationRequest(row.id);
      await exportQuotationRequestPdf(full, { logoDataUrl });
    } catch (e) {
      toast.error(e.message || "Falha ao exportar PDF");
    }
  };

  const dup = async (row) => {
    if (!window.confirm("Duplicar esta solicitação com novo número?")) return;
    try {
      const copy = await duplicateQuotationRequest(row.id);
      toast.success("Solicitação duplicada");
      nav(quotationEditorPath(copy.id));
    } catch (e) {
      toast.error(e.message || "Falha ao duplicar");
    }
  };

  const changeStatus = async (newStatus) => {
    if (!statusDialogRow) return;
    setStatusChanging(true);
    try {
      await transitionQuotationStatus(statusDialogRow.id, newStatus, { userId: user?.id });
      toast.success(`Status: ${statusLabel(newStatus)}`);
      setStatusDialogRow(null);
      load();
    } catch (e) {
      toast.error(e.message || "Falha ao alterar status");
    } finally {
      setStatusChanging(false);
    }
  };

  const remove = async (row) => {
    if (!window.confirm("Excluir esta solicitação?")) return;
    try {
      await deleteQuotationRequest(row.id);
      toast.success("Removida");
      load();
    } catch (e) {
      toast.error(e.message || "Falha ao excluir");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">Solicitações de Orçamento</h2>
        <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white">
          <Link to={QUOTATION_NEW_PATH}><Plus size={16} className="mr-1.5" /> Nova solicitação</Link>
        </Button>
      </div>

      <Card className="border-slate-200">
        <CardContent className="p-4 flex flex-wrap gap-3">
          <select
            className="h-9 border border-slate-200 rounded-md px-2 text-sm"
            value={filters.year}
            onChange={(e) => setFilters((f) => ({ ...f, year: e.target.value }))}
          >
            {[0, 1, 2, 3].map((o) => {
              const y = new Date().getFullYear() - o;
              return <option key={y} value={String(y)}>{y}</option>;
            })}
          </select>
          <select
            className="h-9 border border-slate-200 rounded-md px-2 text-sm min-w-[140px]"
            value={filters.status}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
          >
            <option value="all">Todos os status</option>
            {QUOTATION_REQUEST_STATUSES.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
          <select
            className="h-9 border border-slate-200 rounded-md px-2 text-sm min-w-[160px]"
            value={filters.type}
            onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}
          >
            <option value="all">Todos os tipos</option>
            {QUOTATION_REQUEST_TYPES.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
          <select
            className="h-9 border border-slate-200 rounded-md px-2 text-sm min-w-[160px]"
            value={filters.supplierId}
            onChange={(e) => setFilters((f) => ({ ...f, supplierId: e.target.value }))}
          >
            <option value="">Todos fornecedores</option>
            {(cadastro.suppliers || []).map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </CardContent>
      </Card>

      <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white">
        <table className="w-full text-sm min-w-[800px]">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="p-3 text-left">Nº</th>
              <th className="p-3 text-left">Data</th>
              <th className="p-3 text-left">Fornecedor</th>
              <th className="p-3 text-left">Enviado por</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="p-6 text-center text-slate-500">A carregar…</td></tr>
            ) : !rows.length ? (
              <tr><td colSpan={6} className="p-6 text-center text-slate-500">Nenhuma solicitação encontrada.</td></tr>
            ) : rows.map((row) => (
              <tr key={row.id} className="border-t border-slate-100 hover:bg-slate-50/50">
                <td className="p-3 font-medium">{formatRequestNumber(row.request_number, row.request_year)}</td>
                <td className="p-3">{row.request_date ? new Date(`${row.request_date}T12:00:00`).toLocaleDateString("pt-BR") : "—"}</td>
                <td className="p-3">{row.supplier_data_snapshot?.company || row.supplier?.name || "—"}</td>
                <td className="p-3">{row.sent_by_data_snapshot?.full_name || "—"}</td>
                <td className="p-3">
                  <button
                    type="button"
                    className="inline-flex"
                    onClick={() => setStatusDialogRow(row)}
                  >
                    <Badge variant="outline">{statusLabel(row.status)}</Badge>
                  </button>
                </td>
                <td className="p-3 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm"><CaretDown size={14} /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => nav(quotationEditorPath(row.id))}>
                        <PencilSimple size={16} className="mr-2" /> Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => exportPdf(row)}>
                        <FilePdf size={16} className="mr-2" /> Exportar PDF
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => dup(row)}>
                        <Copy size={16} className="mr-2" /> Duplicar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setStatusDialogRow(row)}>
                        <ArrowsClockwise size={16} className="mr-2" /> Alterar status
                      </DropdownMenuItem>
                      <DropdownMenuItem disabled title="Em breve">
                        Converter em Pedido de Compra
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600" onClick={() => remove(row)}>
                        <Trash size={16} className="mr-2" /> Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={!!statusDialogRow} onOpenChange={(o) => !o && setStatusDialogRow(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Status — {statusDialogRow && formatRequestNumber(statusDialogRow.request_number, statusDialogRow.request_year)}
            </DialogTitle>
          </DialogHeader>
          {statusDialogRow && (
            <QuotationRequestStatusPanel
              bare
              status={statusDialogRow.status}
              isNew={false}
              disabled={statusChanging}
              onTransition={changeStatus}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
