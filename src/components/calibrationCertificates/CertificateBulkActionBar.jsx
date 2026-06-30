import React from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle, PaperPlaneTilt } from "@phosphor-icons/react";

export default function CertificateBulkActionBar({
  selectedCount = 0,
  totalSelectable = 0,
  allSelected = false,
  onToggleAll,
  onApprove,
  onSendEmail,
  canApprove = false,
  canSend = false,
  busy = false,
  mode = "all",
}) {
  if (!selectedCount && mode !== "approval") return null;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
      {onToggleAll && (
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <Checkbox checked={allSelected} onCheckedChange={onToggleAll} disabled={busy || !totalSelectable} />
          <span className="text-slate-700">
            {selectedCount ? `${selectedCount} selecionado(s)` : "Selecionar"}
          </span>
        </label>
      )}
      {canApprove && onApprove && (
        <Button type="button" size="sm" onClick={onApprove} disabled={busy || !selectedCount}>
          <CheckCircle size={16} className="mr-1" />
          Aprovar ({selectedCount || 0})
        </Button>
      )}
      {canSend && onSendEmail && (
        <Button type="button" size="sm" variant="default" className="bg-blue-600 hover:bg-blue-700" onClick={onSendEmail} disabled={busy || !selectedCount}>
          <PaperPlaneTilt size={16} className="mr-1" />
          Enviar por e-mail ({selectedCount || 0})
        </Button>
      )}
    </div>
  );
}
