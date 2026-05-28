import React, { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useOutletContext } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { isSupabaseAuthMode } from "@/lib/api";
import { canAccessPurchaseOrders } from "@/lib/roles";
import { listPurchaseOrders, deletePurchaseOrder } from "@/lib/purchaseOrdersApi";
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
import { Plus, CaretDown, PencilSimple, Trash, FilePdf, Copy } from "@phosphor-icons/react";
import { toast } from "sonner";
import { TENANT_BRANDING_BUCKET } from "@/lib/tenantBranding";
import { supabase } from "@/lib/supabaseClient";
import { duplicatePurchaseOrder } from "@/lib/purchaseOrdersApi";

function typeLabel(type) {
  return PURCHASE_ORDER_TYPES.find((t) => t.id === type)?.label || type;
}

export default function PedidosCompraPage() {
  const { user } = useAuth();
  const { currentTenantId, currentTenant } = useOutletContext();
  const nav = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ type: "all", status: "all", year: String(new Date().getFullYear()) });

  const load = useCallback(async () => {
    if (!currentTenantId || !isSupabaseAuthMode) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await listPurchaseOrders(currentTenantId, {
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
  }, [currentTenantId, filters]);

  useEffect(() => {
    load();
  }, [load]);

  if (!canAccessPurchaseOrders(user?.role)) {
    return <div className="text-slate-600">Sem permissão para pedidos de compra.</div>;
  }
  if (!isSupabaseAuthMode) {
    return <div className="text-slate-600">Pedidos de compra requerem modo Supabase.</div>;
  }
  if (!currentTenantId) {
    return <div className="text-slate-600">Selecione um ambiente no topo.</div>;
  }

  const exportPdf = async (row) => {
    try {
      let logoDataUrl = null;
      if (currentTenant?.logo_storage_path) {
        const { data } = await supabase.storage.from(TENANT_BRANDING_BUCKET).createSignedUrl(
          currentTenant.logo_storage_path,
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
      const full = await import("@/lib/purchaseOrdersApi").then((m) => m.getPurchaseOrder(row.id));
      await exportPedidoCompraPdf(full, { logoDataUrl });
    } catch (e) {
      toast.error(e.message || "Falha ao exportar PDF");
    }
  };

  const dup = async (row) => {
    try {
      const copy = await duplicatePurchaseOrder(row.id);
      toast.success("Pedido duplicado");
      nav(pedidoEditorPath(copy.id));
    } catch (e) {
      toast.error(e.message || "Falha ao duplicar");
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
    <div className="space-y-6 min-w-0" data-testid="pedidos-compra-page">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">Pedidos de Compra</h1>
          <p className="text-sm text-slate-600 mt-1">Ambiente: {currentTenant?.name}</p>
        </div>
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
                  <td className="p-3"><Badge variant="outline">{statusLabel(r.status)}</Badge></td>
                  <td className="p-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm"><CaretDown size={14} /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => nav(pedidoEditorPath(r.id))}>
                          <PencilSimple size={16} className="mr-2" /> Editar
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
    </div>
  );
}
