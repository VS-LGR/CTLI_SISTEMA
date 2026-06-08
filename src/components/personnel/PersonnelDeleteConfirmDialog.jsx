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

export default function PersonnelDeleteConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  expectedText,
  usageCounts = null,
  onConfirm,
  busy = false,
}) {
  const [step, setStep] = useState(1);
  const [typed, setTyped] = useState("");

  useEffect(() => {
    if (!open) {
      setStep(1);
      setTyped("");
    }
  }, [open]);

  const hasBlockingUsage = usageCounts?.blockingTotal > 0;
  const canConfirm = !hasBlockingUsage && typed.trim() === (expectedText || "").trim();

  const usageLines = [];
  if (usageCounts?.employees) usageLines.push(`${usageCounts.employees} colaborador(es) vinculado(s)`);
  if (usageCounts?.adequacies) usageLines.push(`${usageCounts.adequacies} adequação(ões) de competência`);
  if (usageCounts?.monitorings) usageLines.push(`${usageCounts.monitorings} monitoramento(s)`);
  if (usageCounts?.experienceEvaluations) usageLines.push(`${usageCounts.experienceEvaluations} avaliação(ões) de experiência (referência)`);
  if (usageCounts?.selections) usageLines.push(`${usageCounts.selections} seleção(ões) de pessoal (referência)`);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-left text-sm text-slate-600">
              {step === 1 ? (
                <p>{description}</p>
              ) : (
                <>
                  <p>Esta ação é irreversível. Para confirmar, digite o nome exato do cargo:</p>
                  <p className="font-semibold text-slate-900">{expectedText}</p>
                  {hasBlockingUsage && (
                    <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-amber-900">
                      <p className="font-medium mb-1">Exclusão bloqueada — vínculos encontrados:</p>
                      <ul className="list-disc pl-5 space-y-0.5">
                        {usageLines.map((line) => (
                          <li key={line}>{line}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {!hasBlockingUsage && (
                    <div>
                      <Label htmlFor="confirm-delete-text">Nome do cargo</Label>
                      <Input
                        id="confirm-delete-text"
                        value={typed}
                        onChange={(e) => setTyped(e.target.value)}
                        className="mt-1 h-10"
                        placeholder={expectedText}
                        autoComplete="off"
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
          {step === 1 ? (
            <Button
              variant="destructive"
              disabled={busy}
              onClick={() => setStep(2)}
            >
              Continuar
            </Button>
          ) : (
            <Button
              variant="destructive"
              disabled={busy || !canConfirm}
              onClick={async () => {
                await onConfirm?.();
              }}
            >
              {confirmLabel || "Excluir permanentemente"}
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
