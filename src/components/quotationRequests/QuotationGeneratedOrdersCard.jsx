import React from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatOrderNumber, getTitleForType } from "@/lib/purchaseOrderTypes";
import { sectionTypeLabel } from "@/lib/quotationToPurchaseOrder";
import { pedidoEditorPath } from "@/lib/pedidosCompraRoutes";
import { ArrowSquareOut } from "@phosphor-icons/react";

export default function QuotationGeneratedOrdersCard({ conversions = [] }) {
  if (!conversions.length) return null;

  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Pedidos de compra gerados</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {conversions.map((conv) => {
            const po = conv.purchase_order;
            if (!po?.id) return null;
            return (
              <li key={conv.id}>
                <Link
                  to={pedidoEditorPath(po.id)}
                  className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2.5 text-sm hover:border-blue-200 hover:bg-blue-50/40 transition-colors"
                >
                  <span className="font-mono font-semibold text-blue-700">
                    {formatOrderNumber(po.order_number, po.order_year)}
                  </span>
                  <span className="text-slate-400">·</span>
                  <span className="text-slate-700">{getTitleForType(po.type)}</span>
                  <span className="text-slate-400 hidden sm:inline">·</span>
                  <span className="text-slate-500 text-xs w-full sm:w-auto">
                    Origem: {sectionTypeLabel(conv.section_type)}
                  </span>
                  <ArrowSquareOut size={14} className="text-slate-400 ml-auto shrink-0" />
                </Link>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
