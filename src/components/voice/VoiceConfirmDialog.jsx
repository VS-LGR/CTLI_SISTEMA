import React, { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { interpretSpokenField } from "@/lib/voice/spokenMatch";
import { cn } from "@/lib/utils";

/**
 * Confirmação obrigatória de valor ditado (ALCOA+ / PR-7.2).
 * Tab / Enter = Confirmar (e continuar).
 */
export default function VoiceConfirmDialog({
  open,
  fieldLabel = "Valor",
  transcript = "",
  listening = false,
  interim = "",
  error = "",
  kind = "number",
  options = [],
  records = [],
  getLabel,
  getSearchText,
  confirmLabel = "Confirmar",
  onConfirm,
  onRetry,
  onCancel,
}) {
  const interpreted = useMemo(
    () => interpretSpokenField(kind, transcript, { options, records, getLabel, getSearchText }),
    [kind, transcript, options, records, getLabel, getSearchText],
  );

  const [selectedMatchId, setSelectedMatchId] = useState(null);

  useEffect(() => {
    if (!open) {
      setSelectedMatchId(null);
      return;
    }
    if (interpreted.ok && interpreted.matches?.length) {
      setSelectedMatchId(interpreted.matches[0].id);
    } else {
      setSelectedMatchId(null);
    }
  }, [open, interpreted]);

  const selectedMatch = (interpreted.matches || []).find((m) => m.id === selectedMatchId)
    || interpreted.matches?.[0]
    || null;

  const canConfirm = Boolean(
    !listening
    && interpreted.ok
    && (
      kind === "lookup" || kind === "choice"
        ? selectedMatch || interpreted.value != null
        : interpreted.value != null && interpreted.value !== ""
    ),
  );

  const resolvePayload = () => {
    if (kind === "lookup" || (kind === "choice" && selectedMatch)) {
      const m = selectedMatch || interpreted.matches?.[0];
      return {
        value: m?.value ?? interpreted.value,
        label: m?.label ?? interpreted.label,
        record: m?.record ?? interpreted.record,
        kind,
      };
    }
    return {
      value: interpreted.value,
      label: interpreted.label || interpreted.value,
      record: interpreted.record || null,
      kind,
    };
  };

  const doConfirm = () => {
    if (!canConfirm) return;
    onConfirm?.(resolvePayload());
  };

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (listening) return;
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel?.();
        return;
      }
      if (e.key === "Tab" || e.key === "Enter") {
        if (!canConfirm) return;
        e.preventDefault();
        doConfirm();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, listening, canConfirm, selectedMatchId, interpreted]);

  const displayLive = listening ? (interim || "A ouvir…") : (transcript || "—");
  const displayValue = kind === "lookup" || kind === "choice"
    ? (selectedMatch?.label || interpreted.label || interpreted.value)
    : interpreted.value;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onCancel?.(); }}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-lg">Confirmar valor por voz</DialogTitle>
          <DialogDescription className="text-sm">
            {fieldLabel}. Tab ou Enter confirma e continua. Confirme antes de gravar (PR-7.2).
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
            {interpreted.ok ? (
              <p className={cn(
                "font-semibold text-slate-900",
                kind === "number" ? "text-2xl tabular-nums" : "text-lg",
              )}
              >
                {displayValue}
              </p>
            ) : (
              <p className="text-sm text-amber-800">
                {transcript ? interpreted.message : "Aguarde o reconhecimento ou fale novamente."}
              </p>
            )}
          </div>

          {interpreted.ok && interpreted.matches?.length > 1 && (
            <div className="space-y-1.5">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">
                Resultados da pesquisa — selecione o correto
              </p>
              <ul className="max-h-40 overflow-y-auto space-y-1">
                {interpreted.matches.map((m, i) => (
                  <li key={m.id}>
                    <button
                      type="button"
                      className={cn(
                        "w-full text-left rounded-md border px-3 py-2 text-sm min-h-11",
                        selectedMatchId === m.id
                          ? "border-blue-500 bg-blue-50 text-blue-900"
                          : "border-slate-200 bg-white hover:bg-slate-50",
                      )}
                      onClick={() => setSelectedMatchId(m.id)}
                    >
                      <span className="text-slate-500 mr-2">{i + 1}.</span>
                      {m.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

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
            disabled={!canConfirm}
            onClick={doConfirm}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
