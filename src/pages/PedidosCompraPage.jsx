import React from "react";
import { Link, useOutletContext } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { isSupabaseAuthMode } from "@/lib/api";
import { canAccessPurchaseOrders } from "@/lib/roles";
import { PR_66_PEDIDOS_PATH } from "@/lib/pedidosCompraRoutes";
import PurchaseOrdersListPanel from "@/components/purchaseOrders/PurchaseOrdersListPanel";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "@phosphor-icons/react";

export default function PedidosCompraPage() {
  const { user } = useAuth();
  const { currentTenantId, currentTenant } = useOutletContext();

  if (!canAccessPurchaseOrders(user?.role)) {
    return <div className="text-slate-600">Sem permissão para pedidos de compra.</div>;
  }
  if (!isSupabaseAuthMode) {
    return <div className="text-slate-600">Pedidos de compra requerem modo Supabase.</div>;
  }
  if (!currentTenantId) {
    return <div className="text-slate-600">Selecione um ambiente no topo.</div>;
  }

  return (
    <div className="space-y-6 min-w-0" data-testid="pedidos-compra-page">
      <div>
        <Button variant="ghost" size="sm" className="mb-2 -ml-2 text-slate-600" asChild>
          <Link to={PR_66_PEDIDOS_PATH}>
            <ArrowLeft size={16} className="mr-1" /> Voltar ao PR-6.6
          </Link>
        </Button>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">Pedidos de Compra</h1>
        <p className="text-sm text-slate-600 mt-1">Ambiente: {currentTenant?.name}</p>
      </div>
      <PurchaseOrdersListPanel tenantId={currentTenantId} tenant={currentTenant} />
    </div>
  );
}
