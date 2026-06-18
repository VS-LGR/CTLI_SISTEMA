import React, { useState } from "react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function CertificateObsoleteDialog({
  open,
  onOpenChange,
  certificateLabel,
  onConfirm,
  busy = false,
}) {
  const [reason, setReason] = useState("");

  const handleClose = (next) => {
    if (!busy) {
      if (!next) setReason("");
      onOpenChange(next);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Marcar certificado como obsoleto?</AlertDialogTitle>
          <AlertDialogDescription>
            O certificado <strong>{certificateLabel}</strong> deixará de aparecer nos fluxos ativos.
            Depois de obsoleto, poderá removê-lo permanentemente com confirmação dupla.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div>
          <Label className="text-xs">Motivo (opcional)</Label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="mt-1"
            rows={2}
            placeholder="Ex.: duplicado, erro de cadastro, substituído manualmente…"
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
          <Button
            disabled={busy}
            className="bg-amber-600 hover:bg-amber-700"
            onClick={() => onConfirm?.(reason.trim())}
          >
            {busy ? "A marcar…" : "Marcar obsoleto"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
