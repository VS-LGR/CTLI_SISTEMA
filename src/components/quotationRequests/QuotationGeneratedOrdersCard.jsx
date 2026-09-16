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
    <Card className="border-border">
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
                  className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-border bg-background/80 px-3 py-2.5 text-sm hover:border-primary/30 hover:bg-primary/10 transition-colors"
                >
                  <span className="font-mono font-semibold text-primary">
                    {formatOrderNumber(po.order_number, po.order_year)}
                  </span>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-foreground/90">{getTitleForType(po.type)}</span>
                  <span className="text-muted-foreground hidden sm:inline">·</span>
                  <span className="text-muted-foreground text-xs w-full sm:w-auto">
                    Origem: {sectionTypeLabel(conv.section_type)}
                  </span>
                  <ArrowSquareOut size={14} className="text-muted-foreground ml-auto shrink-0" />
                </Link>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
