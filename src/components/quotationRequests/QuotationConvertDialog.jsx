import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getQuotationRequest, convertQuotationToPurchaseOrders } from "@/lib/quotationRequestsApi";
import {
  getQuotationConversionState,
  mapQuotationSectionToPoType,
  poTypeLabel,
  sectionTypeLabel,
} from "@/lib/quotationToPurchaseOrder";
import { formatRequestNumber } from "@/lib/quotationRequestDisplay";
import { formatOrderNumber } from "@/lib/purchaseOrderTypes";
import { pedidoEditorPath } from "@/lib/pedidosCompraRoutes";
import { ArrowSquareOut, Warning } from "@phosphor-icons/react";
import { toast } from "sonner";

export default function QuotationConvertDialog({
  open,
  onOpenChange,
  quotationId,
  userId,
  onConverted,
}) {
  const nav = useNavigate();
  const [loading, setLoading] = useState(false);
  const [converting, setConverting] = useState(false);
  const [quotation, setQuotation] = useState(null);

  useEffect(() => {
    if (!open || !quotationId) {
      setQuotation(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getQuotationRequest(quotationId)
      .then((data) => {
        if (!cancelled) setQuotation(data);
      })
      .catch((e) => {
        if (!cancelled) toast.error(e.message || "Falha ao carregar solicitação");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [open, quotationId]);

  const state = useMemo(
    () => (quotation ? getQuotationConversionState(quotation, quotation.conversions) : null),
    [quotation],
  );

  const handleConvert = async () => {
    if (!quotationId) return;
    setConverting(true);
    try {
      const result = await convertQuotationToPurchaseOrders(quotationId, { userId });
      const count = result.purchaseOrders?.length || 0;
      toast.success(
        count === 1
          ? "Pedido de compra criado com sucesso"
          : `${count} pedidos de compra criados com sucesso`,
      );
      onConverted?.(result);
      onOpenChange(false);
      const first = result.purchaseOrders?.[0]?.order;
      if (first?.id) nav(pedidoEditorPath(first.id));
    } catch (e) {
      toast.error(e.message || "Falha ao converter solicitação");
    } finally {
      setConverting(false);
    }
  };

  const title = quotation
    ? formatRequestNumber(quotation.request_number, quotation.request_year)
    : "…";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Converter em Pedido de Compra</DialogTitle>
          <DialogDescription>
            Solicitação {title} — será criado um pedido por tipo convertível.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <p className="text-sm text-slate-500 py-4">A carregar…</p>
        ) : !quotation ? (
          <p className="text-sm text-slate-500 py-4">Solicitação não encontrada.</p>
        ) : (
          <div className="space-y-4">
            {state?.trainingSelected && (
              <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
                <Warning size={18} className="shrink-0 mt-0.5" />
                <p>
                  <strong>Treinamento</strong> não possui pedido de compra equivalente e será ignorado na conversão.
                </p>
              </div>
            )}

            {state?.pending?.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                  Serão criados ({state.pending.length})
                </p>
                <ul className="space-y-2">
                  {state.pending.map((sectionType) => {
                    const poType = mapQuotationSectionToPoType(sectionType);
                    return (
                      <li
                        key={sectionType}
                        className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                      >
                        <span className="font-medium text-slate-800">{sectionTypeLabel(sectionType)}</span>
                        <span className="text-slate-500"> → </span>
                        <span className="text-slate-700">{poTypeLabel(poType)}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {(quotation.conversions || []).length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                  Já convertidos
                </p>
                <ul className="space-y-1.5">
                  {quotation.conversions.map((conv) => {
                    const po = conv.purchase_order;
                    if (!po) return null;
                    return (
                      <li key={conv.id}>
                        <Link
                          to={pedidoEditorPath(po.id)}
                          className="inline-flex items-center gap-1.5 text-sm text-blue-700 hover:underline"
                        >
                          {sectionTypeLabel(conv.section_type)}
                          {" · "}
                          {formatOrderNumber(po.order_number, po.order_year)}
                          <ArrowSquareOut size={14} />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {!state?.canConvert && !state?.pending?.length && (
              <p className="text-sm text-slate-600">
                {quotation.status === "convertida_pedido_compra"
                  ? "Todos os tipos convertíveis já foram convertidos."
                  : "Não há tipos elegíveis para conversão nesta solicitação."}
              </p>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            className="bg-blue-600 hover:bg-blue-700 text-white"
            disabled={loading || converting || !state?.canConvert}
            onClick={handleConvert}
          >
            {converting
              ? "A converter…"
              : state?.pending?.length === 1
                ? "Criar 1 pedido de compra"
                : `Criar ${state?.pending?.length || 0} pedidos de compra`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
