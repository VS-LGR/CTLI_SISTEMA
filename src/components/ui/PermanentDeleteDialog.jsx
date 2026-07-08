import React, { useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const PERMANENT_DELETE_CONFIRM_WORD = "EXCLUIR";

export default function PermanentDeleteDialog({
  open,
  onOpenChange,
  title = "Remover permanentemente?",
  description,
  entityLabel,
  confirmWord = PERMANENT_DELETE_CONFIRM_WORD,
  onConfirm,
  busy = false,
  children,
}) {
  const [step, setStep] = useState(1);
  const [confirmText, setConfirmText] = useState("");

  useEffect(() => {
    if (!open) {
      setStep(1);
      setConfirmText("");
    }
  }, [open]);

  const handleClose = (next) => {
    if (!busy) onOpenChange(next);
  };

  const canDelete = confirmText.trim().toUpperCase() === confirmWord.toUpperCase();

  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent>
        {step === 1 ? (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>{title}</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-2 text-sm text-muted-foreground">
                  {description || (
                    <p>
                      O item <strong>{entityLabel}</strong> será apagado permanentemente.
                      Esta ação <strong>não pode ser desfeita</strong>.
                    </p>
                  )}
                  {children}
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
              <Button variant="destructive" disabled={busy} onClick={() => setStep(2)}>
                Continuar
              </Button>
            </AlertDialogFooter>
          </>
        ) : (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmação final</AlertDialogTitle>
              <AlertDialogDescription>
                Digite <strong>{confirmWord}</strong> para confirmar a remoção permanente de{" "}
                <strong>{entityLabel}</strong>.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div>
              <Label className="text-xs">Confirmação</Label>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="mt-1 font-mono uppercase"
                placeholder={confirmWord}
                autoComplete="off"
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={busy} onClick={() => setStep(1)}>
                Voltar
              </AlertDialogCancel>
              <Button
                variant="destructive"
                disabled={busy || !canDelete}
                onClick={() => onConfirm?.()}
              >
                {busy ? "A remover…" : "Remover permanentemente"}
              </Button>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}
