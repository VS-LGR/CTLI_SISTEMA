import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrencyBRL, totalPieces } from "@/lib/purchaseOrderCalculations";

export default function PurchaseOrderItemsFooter({
  items,
  discount,
  taxesMode,
  subtotal,
  finalValue,
  onDiscountChange,
  onTaxesModeChange,
  readOnly = false,
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
      <div>
        <Label className="text-xs text-slate-500">Total de peças</Label>
        <div className="text-lg font-semibold text-slate-900 mt-1">{totalPieces(items)}</div>
      </div>
      <div>
        <Label className="text-xs text-slate-500">Subtotal</Label>
        <div className="text-lg font-semibold text-slate-900 mt-1">{formatCurrencyBRL(subtotal)}</div>
      </div>
      <div>
        <Label>Desconto (R$)</Label>
        <Input
          type="number"
          min={0}
          step="0.01"
          value={discount}
          disabled={readOnly}
          onChange={(e) => onDiscountChange?.(e.target.value)}
          className="mt-1"
        />
      </div>
      <div>
        <Label>Impostos</Label>
        <select
          value={taxesMode}
          disabled={readOnly}
          onChange={(e) => onTaxesModeChange?.(e.target.value)}
          className="w-full border border-slate-200 rounded-md h-10 px-3 mt-1 text-sm bg-white disabled:opacity-60"
        >
          <option value="incluso">Incluso</option>
          <option value="percentual">Percentual extra</option>
          <option value="nenhum">Nenhum</option>
        </select>
        <div className="text-lg font-display font-bold text-blue-700 mt-3">
          Valor final: {formatCurrencyBRL(finalValue)}
        </div>
      </div>
    </div>
  );
}
