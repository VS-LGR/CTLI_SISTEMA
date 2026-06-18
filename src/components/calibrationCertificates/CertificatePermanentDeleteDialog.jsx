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

const CONFIRM_WORD = "EXCLUIR";

export default function CertificatePermanentDeleteDialog({
  open,
  onOpenChange,
  certificateLabel,
  onConfirm,
  busy = false,
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

  const canDelete = confirmText.trim().toUpperCase() === CONFIRM_WORD;

  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent>
        {step === 1 ? (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>Remover certificado permanentemente?</AlertDialogTitle>
              <AlertDialogDescription>
                O certificado obsoleto <strong>{certificateLabel}</strong> será apagado da base de dados
                com todos os pontos, padrões e histórico. Esta ação <strong>não pode ser desfeita</strong>.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
              <Button
                variant="destructive"
                disabled={busy}
                onClick={() => setStep(2)}
              >
                Continuar
              </Button>
            </AlertDialogFooter>
          </>
        ) : (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmação final</AlertDialogTitle>
              <AlertDialogDescription>
                Digite <strong>{CONFIRM_WORD}</strong> para confirmar a remoção permanente de{" "}
                <strong>{certificateLabel}</strong>.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div>
              <Label className="text-xs">Confirmação</Label>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="mt-1 font-mono uppercase"
                placeholder={CONFIRM_WORD}
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
