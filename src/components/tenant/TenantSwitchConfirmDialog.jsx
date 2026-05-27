import React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function TenantSwitchConfirmDialog({
  open,
  onOpenChange,
  currentTenant,
  pendingTenant,
  onConfirm,
  busy = false,
}) {
  const fromName = currentTenant?.name || "ambiente atual";
  const toName = pendingTenant?.name || "novo ambiente";

  return (
    <AlertDialog
      open={open}
      onOpenChange={(v) => {
        if (!busy) onOpenChange?.(v);
      }}
    >
      <AlertDialogContent className="max-w-[min(24rem,calc(100vw-2rem))]">
        <AlertDialogHeader>
          <AlertDialogTitle>Trocar de ambiente?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                Vai sair de <strong className="text-slate-800">{fromName}</strong> e passar a
                pré-visualizar <strong className="text-slate-800">{toName}</strong>.
              </p>
              <p>
                Documentos, coletas, cadastros e ficheiros passam a ser apenas deste cliente.
                Para evitar confusão, será redirecionado à dashboard inicial.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col-reverse sm:flex-row gap-2">
          <AlertDialogCancel disabled={busy} onClick={() => onOpenChange?.(false)}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            className="bg-blue-600 hover:bg-blue-700"
            disabled={busy || !pendingTenant}
            onClick={(e) => {
              e.preventDefault();
              onConfirm?.();
            }}
          >
            {busy ? "A mudar…" : "Confirmar e ir à dashboard"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
