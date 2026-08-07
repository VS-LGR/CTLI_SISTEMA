import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSpeechToText } from "@/hooks/useSpeechToText";
import { parseSpokenNumber } from "@/lib/voice/parseSpokenNumber";
import { isSpeechRecognitionSupported } from "@/lib/voice/speechRecognition";

function speakPrompt(text) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "pt-BR";
    u.rate = 1;
    window.speechSynthesis.speak(u);
  } catch {
    /* ignore */
  }
}

/**
 * Sequência guiada ABA / ambiente (Modo 2).
 * fields: [{ id, label, prompt?, apply(value) }]
 */
export default function VoiceGuidedSession({
  open,
  title = "Sequência de voz",
  fields = [],
  onClose,
  onComplete,
}) {
  const supported = isSpeechRecognitionSupported();
  const speech = useSpeechToText({ enabled: open && supported });
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState("prompt"); // prompt | listening | confirm

  const field = fields[index] || null;
  const total = fields.length;

  const parsed = useMemo(
    () => parseSpokenNumber(speech.finalTranscript),
    [speech.finalTranscript],
  );

  const resetForField = useCallback(() => {
    speech.abort();
    speech.clearTranscript();
    setPhase("prompt");
  }, [speech]);

  useEffect(() => {
    if (!open) {
      speech.abort();
      setIndex(0);
      setPhase("prompt");
      return undefined;
    }
    setIndex(0);
    setPhase("prompt");
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only on open
  }, [open]);

  useEffect(() => {
    if (!open || !field || phase !== "prompt") return undefined;
    const prompt = field.prompt || `Informe ${field.label}`;
    speakPrompt(prompt);
    const t = setTimeout(() => {
      setPhase("listening");
      speech.clearTranscript();
      speech.start();
    }, 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, index, phase, field?.id]);

  useEffect(() => {
    if (!open || phase !== "listening") return;
    if (speech.finalTranscript && !speech.listening) {
      setPhase("confirm");
    }
  }, [open, phase, speech.finalTranscript, speech.listening]);

  const handleConfirm = () => {
    if (!parsed.ok || !field) return;
    field.apply?.(parsed.value);
    if (index + 1 >= total) {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      onComplete?.();
      onClose?.();
      return;
    }
    setIndex((i) => i + 1);
    resetForField();
  };

  const handleRetry = () => {
    speech.clearTranscript();
    setPhase("listening");
    speech.start();
  };

  const handleSkip = () => {
    if (index + 1 >= total) {
      onClose?.();
      return;
    }
    setIndex((i) => i + 1);
    resetForField();
  };

  const handleClose = () => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    speech.abort();
    onClose?.();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="sm:max-w-lg" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {total
              ? `Passo ${Math.min(index + 1, total)} de ${total} — ordem ABA (PR-7.2 Tabela 01).`
              : "Nenhum campo na sequência."}
          </DialogDescription>
        </DialogHeader>

        {!supported ? (
          <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
            Reconhecimento de voz não suportado neste navegador. Use Chrome ou Edge.
          </p>
        ) : field ? (
          <div className="space-y-3">
            <p className="text-base font-medium text-slate-900">{field.label}</p>
            <div className="rounded-md border bg-slate-50 px-3 py-3 min-h-[3.5rem]">
              <p className="text-[11px] uppercase tracking-wide text-slate-500 mb-1">
                {phase === "listening" || speech.listening ? "A ouvir" : "Transcrição"}
              </p>
              <p className="text-base text-slate-900 break-words">
                {speech.listening
                  ? (speech.interim || "A ouvir…")
                  : (speech.finalTranscript || "—")}
              </p>
            </div>
            <div className="rounded-md border px-3 py-3">
              <p className="text-[11px] uppercase tracking-wide text-slate-500 mb-1">Valor interpretado</p>
              {parsed.ok ? (
                <p className="text-2xl font-semibold tabular-nums">{parsed.value}</p>
              ) : (
                <p className="text-sm text-slate-600">
                  {speech.finalTranscript ? parsed.message : "Fale o valor numérico."}
                </p>
              )}
            </div>
            {speech.error ? (
              <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-md px-3 py-2">
                {speech.error}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-slate-600">Sequência vazia.</p>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button type="button" variant="outline" className="min-h-11 text-base" onClick={handleClose}>
            Encerrar
          </Button>
          <Button type="button" variant="ghost" className="min-h-11 text-base" onClick={handleSkip}>
            Pular
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="min-h-11 text-base"
            disabled={speech.listening || !supported}
            onClick={handleRetry}
          >
            Refazer
          </Button>
          <Button
            type="button"
            className="min-h-11 text-base bg-blue-600 hover:bg-blue-700"
            disabled={!parsed.ok || speech.listening}
            onClick={handleConfirm}
          >
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Monta fila ABA (P→M) para um item de peso. */
export function buildAbaCycleVoiceFields(item, setCycleReading) {
  const cycles = Array.isArray(item?.cycles) ? item.cycles : [];
  const n = Math.max(cycles.length, Number(item?.cycle_count) || 0);
  const fields = [];
  for (let ci = 0; ci < n; ci += 1) {
    fields.push({
      id: `c${ci}-p`,
      label: `Ciclo ${ci + 1} — Leitura padrão (P)`,
      prompt: `Ciclo ${ci + 1}. Leitura do padrão.`,
      apply: (value) => setCycleReading?.(ci, "standard_reading", value),
    });
    fields.push({
      id: `c${ci}-m`,
      label: `Ciclo ${ci + 1} — Leitura mensurando (M)`,
      prompt: `Ciclo ${ci + 1}. Leitura do mensurando.`,
      apply: (value) => setCycleReading?.(ci, "measuring_reading", value),
    });
  }
  return fields;
}

export const AMBIENT_VOICE_FIELD_DEFS = [
  { key: "temp_inicial", label: "Temperatura inicial (°C)", prompt: "Temperatura inicial em graus Celsius." },
  { key: "temp_final", label: "Temperatura final (°C)", prompt: "Temperatura final em graus Celsius." },
  { key: "umidade_inicial", label: "Umidade inicial (%ur)", prompt: "Umidade relativa inicial." },
  { key: "umidade_final", label: "Umidade final (%ur)", prompt: "Umidade relativa final." },
  { key: "pressao_inicial", label: "Pressão inicial (hPa)", prompt: "Pressão atmosférica inicial." },
  { key: "pressao_final", label: "Pressão final (hPa)", prompt: "Pressão atmosférica final." },
];

export function buildAmbientVoiceFields(setAmbientField) {
  return AMBIENT_VOICE_FIELD_DEFS.map((def) => ({
    id: def.key,
    label: def.label,
    prompt: def.prompt,
    apply: (value) => setAmbientField?.(def.key, value),
  }));
}
