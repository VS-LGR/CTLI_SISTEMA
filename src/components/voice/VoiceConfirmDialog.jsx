import React, { useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { parseSpokenNumber } from "@/lib/voice/parseSpokenNumber";

/**
 * Confirmação obrigatória de valor ditado (ALCOA+ / PR-7.2 Passo 07).
 */
export default function VoiceConfirmDialog({
  open,
  fieldLabel = "Valor",
  transcript = "",
  listening = false,
  interim = "",
  error = "",
  onConfirm,
  onRetry,
  onCancel,
}) {
  const parsed = useMemo(() => parseSpokenNumber(transcript), [transcript]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Enter" && parsed.ok && !listening) {
        e.preventDefault();
        onConfirm?.(parsed.value);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, parsed, listening, onConfirm]);

  const displayLive = listening ? (interim || "A ouvir…") : (transcript || "—");

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onCancel?.(); }}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-lg">Confirmar valor por voz</DialogTitle>
          <DialogDescription className="text-sm">
            {fieldLabel}. Confirme o valor antes de gravar na coleta (PR-7.2).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-md border bg-slate-50 px-3 py-3 min-h-[3.5rem]">
            <p className="text-[11px] uppercase tracking-wide text-slate-500 mb-1">
              {listening ? "A ouvir" : "Transcrição"}
            </p>
            <p className="text-base text-slate-900 break-words">{displayLive}</p>
          </div>

          <div className="rounded-md border px-3 py-3">
            <p className="text-[11px] uppercase tracking-wide text-slate-500 mb-1">Valor interpretado</p>
            {parsed.ok ? (
              <p className="text-2xl font-semibold tabular-nums text-slate-900">{parsed.value}</p>
            ) : (
              <p className="text-sm text-amber-800">
                {transcript ? parsed.message : "Aguarde o reconhecimento ou fale novamente."}
              </p>
            )}
          </div>

          {error ? (
            <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-md px-3 py-2">
              {error}
            </p>
          ) : null}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            className="min-h-11 min-w-[7rem] text-base"
            onClick={onCancel}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="min-h-11 min-w-[7rem] text-base"
            onClick={onRetry}
            disabled={listening}
          >
            Refazer
          </Button>
          <Button
            type="button"
            className="min-h-11 min-w-[7rem] text-base bg-blue-600 hover:bg-blue-700"
            disabled={!parsed.ok || listening}
            onClick={() => onConfirm?.(parsed.value)}
          >
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
