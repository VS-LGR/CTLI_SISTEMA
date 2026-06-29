import React, { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { previewCadastroExport, exportProposalToCadastro } from "@/lib/commercialProposals/commercialProposalCadastroExport";
import { toast } from "sonner";

export default function ProposalExportCadastroDialog({ open, onOpenChange, proposal, onExported }) {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!open || !proposal?.id) {
      setPreview(null);
      return;
    }
    setLoading(true);
    previewCadastroExport(proposal)
      .then(setPreview)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, [open, proposal]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const hasConflict = preview?.scales?.some((s) => s.action === "conflict");
      await exportProposalToCadastro(proposal, { linkExistingScales: !hasConflict });
      toast.success("Cadastro exportado com sucesso");
      onExported?.();
      onOpenChange(false);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setExporting(false);
    }
  };

  const customerAction = preview?.customer?.action;
  const customerLabel = customerAction === "create"
    ? "Criar cliente"
    : customerAction === "update"
      ? "Atualizar cliente existente"
      : customerAction === "link"
        ? "Vincular cliente existente"
        : "—";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Exportar para cadastro</DialogTitle>
        </DialogHeader>
        {loading ? (
          <p className="text-sm text-slate-600">Analisando…</p>
        ) : preview ? (
          <div className="space-y-4 text-sm">
            <div className="rounded-md border border-slate-200 p-3 bg-slate-50">
              <p className="font-medium text-slate-800">Cliente</p>
              <p className="text-slate-600 mt-1">{customerLabel}: {preview.customer.snapshot?.company}</p>
            </div>
            <div>
              <p className="font-medium text-slate-800 mb-2">Balanças</p>
              <ul className="space-y-2">
                {(preview.scales || []).map(({ scale, action, existing }) => (
                  <li key={scale.id || scale.serial_number} className="rounded-md border border-slate-200 p-2">
                    <span className="font-mono text-xs">Série {scale.serial_number}</span>
                    <span className="block text-xs text-slate-600 mt-0.5">
                      {action === "create" && "Será criada no cadastro"}
                      {action === "linked" && "Já vinculada"}
                      {action === "conflict" && `Conflito: série já existe (${existing?.id?.slice(0, 8)}…)`}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleExport} disabled={exporting || loading || !proposal?.id}>
            {exporting ? "Exportando…" : "Confirmar exportação"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
