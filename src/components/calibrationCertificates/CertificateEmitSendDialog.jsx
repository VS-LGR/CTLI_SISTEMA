import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function CertificateEmitSendDialog({
  open,
  onOpenChange,
  count = 1,
  clientEmail = "",
  onEmitAndSend,
  onSkip,
  busy = false,
}) {
  const label = count > 1 ? `${count} certificados` : "este certificado";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Emitir e enviar ao cliente?</DialogTitle>
          <DialogDescription className="space-y-2 pt-1">
            <span className="block">
              {label} foi/foram aprovado(s). Deseja gerar o PDF oficial e enviar por e-mail ao cliente?
            </span>
            {clientEmail ? (
              <span className="block text-slate-700">
                E-mail: <strong className="font-mono">{clientEmail}</strong>
              </span>
            ) : (
              <span className="block text-amber-800">
                E-mail do cliente não cadastrado — atualize em Cadastros → Clientes antes de enviar.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={onSkip} disabled={busy}>
            Agora não
          </Button>
          <Button
            type="button"
            onClick={onEmitAndSend}
            disabled={busy || !clientEmail}
          >
            {busy ? "Enviando…" : "Emitir e enviar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
