import React, { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { isSupabaseAuthMode } from "@/lib/api";
import { canAccessPurchaseOrders } from "@/lib/roles";
import {
  listPurchaseOrders,
  deletePurchaseOrder,
  duplicatePurchaseOrder,
  transitionStatus,
} from "@/lib/purchaseOrdersApi";
import { usePurchaseOrderCadastroData } from "@/hooks/usePurchaseOrderCadastroData";
import PurchaseOrderStatusPanel from "@/components/purchaseOrders/PurchaseOrderStatusPanel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { exportPedidoCompraPdf } from "@/lib/pedidosCompraExport";
import { PEDIDOS_NEW_PATH, pedidoEditorPath } from "@/lib/pedidosCompraRoutes";
import {
  formatOrderNumber,
  PURCHASE_ORDER_TYPES,
  PURCHASE_ORDER_STATUSES,
  statusLabel,
} from "@/lib/purchaseOrderTypes";
import { formatCurrencyBRL } from "@/lib/purchaseOrderCalculations";
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

function typeLabel(type) {
  return PURCHASE_ORDER_TYPES.find((t) => t.id === type)?.label || type;
}

export default function PurchaseOrdersListPanel({ tenantId, tenant }) {
  const { user } = useAuth();
  const nav = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ type: "all", status: "all", year: String(new Date().getFullYear()) });
  const [statusDialogRow, setStatusDialogRow] = useState(null);
  const [statusChanging, setStatusChanging] = useState(false);
  const cadastro = usePurchaseOrderCadastroData(tenantId);
  const employees = cadastro.employees || [];

  const load = useCallback(async () => {
    if (!tenantId || !isSupabaseAuthMode) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await listPurchaseOrders(tenantId, {
        type: filters.type,
        status: filters.status,
        year: filters.year ? Number(filters.year) : undefined,
      });
      setRows(data);
    } catch (e) {
      toast.error(e.message || "Falha ao carregar pedidos");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [tenantId, filters]);

  useEffect(() => {
    load();
  }, [load]);

  if (!canAccessPurchaseOrders(user?.role)) {
    return <div className="text-slate-600 text-sm">Sem permissão para pedidos de compra.</div>;
  }
  if (!isSupabaseAuthMode) {
    return <div className="text-slate-600 text-sm">Pedidos de compra requerem modo Supabase.</div>;
  }
  if (!tenantId) {
    return <div className="text-slate-600 text-sm">Selecione um ambiente no topo.</div>;
  }

  const exportPdf = async (row) => {
    try {
      let logoDataUrl = null;
      if (tenant?.logo_storage_path) {
        const { data } = await supabase.storage.from(TENANT_BRANDING_BUCKET).createSignedUrl(
          tenant.logo_storage_path,
          3600,
        );
        if (data?.signedUrl) {
          const res = await fetch(data.signedUrl);
          const blob = await res.blob();
          logoDataUrl = await new Promise((resolve) => {
            const r = new FileReader();
            r.onload = () => resolve(r.result);
            r.readAsDataURL(blob);
          });
        }
      }
      const { getPurchaseOrder } = await import("@/lib/purchaseOrdersApi");
      const full = await getPurchaseOrder(row.id);
      await exportPedidoCompraPdf(full, { logoDataUrl, employees, tenantId, userId: user?.id });
    } catch (e) {
      toast.error(e.message || "Falha ao exportar PDF");
    }
  };

  const dup = async (row) => {
    if (!window.confirm("Duplicar este pedido com novo número?")) return;
    try {
      const copy = await duplicatePurchaseOrder(row.id);
      toast.success("Pedido duplicado");
      nav(pedidoEditorPath(copy.id));
    } catch (e) {
      toast.error(e.message || "Falha ao duplicar");
    }
  };

  const changeStatus = async (newStatus) => {
    if (!statusDialogRow) return;
    setStatusChanging(true);
    try {
      await transitionStatus(statusDialogRow.id, newStatus);
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
    if (!window.confirm("Excluir este pedido?")) return;
    try {
      await deletePurchaseOrder(row.id);
      toast.success("Removido");
      load();
    } catch (e) {
      toast.error(e.message || "Falha ao excluir");
    }
  };

  return (
    <div className="space-y-4 min-w-0" data-testid="pedidos-compra-panel">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600">Formulários do PR-6.6 — produtos e serviços providos externamente.</p>
        <Button asChild className="bg-blue-600 hover:bg-blue-700 shrink-0">
          <Link to={PEDIDOS_NEW_PATH}><Plus size={18} className="mr-1" /> Novo pedido</Link>
        </Button>
      </div>

      <Card className="border-slate-200">
        <CardContent className="p-4 flex flex-wrap gap-3">
          <select
            className="border rounded-md h-10 px-3 text-sm"
            value={filters.type}
            onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}
          >
            <option value="all">Todos os tipos</option>
            {PURCHASE_ORDER_TYPES.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
          <select
            className="border rounded-md h-10 px-3 text-sm"
            value={filters.status}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
          >
            <option value="all">Todos os status</option>
            {PURCHASE_ORDER_STATUSES.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
          <input
            type="number"
            className="border rounded-md h-10 px-3 text-sm w-28"
            value={filters.year}
            onChange={(e) => setFilters((f) => ({ ...f, year: e.target.value }))}
            placeholder="Ano"
          />
        </CardContent>
      </Card>

      {loading ? (
        <p className="text-slate-600">Carregando…</p>
      ) : (
        <div className="border border-slate-200 rounded-lg overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="p-3">Nº</th>
                <th className="p-3">Tipo</th>
                <th className="p-3">Fornecedor</th>
                <th className="p-3">Data</th>
                <th className="p-3">Valor</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={7} className="p-8 text-center text-slate-500">Nenhum pedido encontrado.</td></tr>
              )}
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50/50">
                  <td className="p-3 font-mono">{formatOrderNumber(r.order_number, r.order_year)}</td>
                  <td className="p-3">{typeLabel(r.type)}</td>
                  <td className="p-3 max-w-[160px] truncate" title={r.supplier_data_snapshot?.company}>
                    {r.supplier_data_snapshot?.company || r.supplier?.name || "—"}
                  </td>
                  <td className="p-3">{r.order_date || "—"}</td>
                  <td className="p-3">{formatCurrencyBRL(r.final_value)}</td>
                  <td className="p-3">
                    <button
                      type="button"
                      className="inline-flex"
                      onClick={() => setStatusDialogRow(r)}
                      title="Alterar status"
                    >
                      <Badge variant="outline" className="cursor-pointer hover:bg-slate-100">
                        {statusLabel(r.status)}
                      </Badge>
                    </button>
                  </td>
                  <td className="p-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm"><CaretDown size={14} /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => nav(pedidoEditorPath(r.id))}>
                          <PencilSimple size={16} className="mr-2" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setStatusDialogRow(r)}>
                          <ArrowsClockwise size={16} className="mr-2" /> Alterar status
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => exportPdf(r)}>
                          <FilePdf size={16} className="mr-2" /> PDF
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => dup(r)}>
                          <Copy size={16} className="mr-2" /> Duplicar
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600" onClick={() => remove(r)}>
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
      )}

      <Dialog open={Boolean(statusDialogRow)} onOpenChange={(open) => !open && setStatusDialogRow(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Alterar status — {statusDialogRow
                ? formatOrderNumber(statusDialogRow.order_number, statusDialogRow.order_year)
                : ""}
            </DialogTitle>
          </DialogHeader>
          {statusDialogRow && (
            <PurchaseOrderStatusPanel
              bare
              compact
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
