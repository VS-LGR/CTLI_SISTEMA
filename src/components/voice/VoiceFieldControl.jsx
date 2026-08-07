import React, { useCallback, useState } from "react";
import { Microphone, MicrophoneSlash } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useSpeechToText } from "@/hooks/useSpeechToText";
import VoiceConfirmDialog from "@/components/voice/VoiceConfirmDialog";

/**
 * Input/select auxiliar com microfone (Modo campo a campo).
 * kinds: number | text | lookup | choice
 */
export default function VoiceFieldControl({
  value = "",
  onChange,
  onConfirmValue,
  onConfirmAndContinue,
  label = "Valor",
  placeholder,
  disabled = false,
  voiceEnabled = false,
  kind = "number",
  options = [],
  records = [],
  getLabel,
  getSearchText,
  displayValue,
  className,
  inputClassName,
  children,
  ...inputProps
}) {
  const speech = useSpeechToText({ enabled: voiceEnabled && !disabled });
  const [dialogOpen, setDialogOpen] = useState(false);

  const closeDialog = useCallback(() => {
    speech.abort();
    speech.clearTranscript();
    setDialogOpen(false);
  }, [speech]);

  const beginListen = useCallback(() => {
    if (!voiceEnabled || disabled || !speech.supported) return;
    setDialogOpen(true);
    speech.clearTranscript();
    speech.start();
  }, [voiceEnabled, disabled, speech]);

  const applyPayload = (payload) => {
    const v = payload?.value;
    if (onConfirmValue) onConfirmValue(payload);
    else if (onChange && v != null) onChange(typeof v === "string" || typeof v === "number" ? String(v) : v);
  };

  const handleConfirm = (payload) => {
    applyPayload(payload);
    closeDialog();
    onConfirmAndContinue?.(payload);
  };

  const handleRetry = () => {
    speech.clearTranscript();
    speech.start();
  };

  const shown = displayValue != null ? displayValue : value;

  return (
    <div className={cn("flex items-center gap-1 min-w-0", className)}>
      {children || (
        <Input
          {...inputProps}
          disabled={disabled}
          placeholder={placeholder}
          className={cn("min-w-0 flex-1", inputClassName)}
          value={shown}
          onChange={(e) => onChange?.(e.target.value)}
        />
      )}
      {voiceEnabled && (
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={disabled || !speech.supported}
          title={
            speech.supported
              ? `Ditar ${label}`
              : "Voz não suportada neste navegador"
          }
          className={cn(
            "h-11 w-11 shrink-0",
            speech.listening && dialogOpen && "border-red-400 text-red-600",
          )}
          onClick={beginListen}
        >
          {speech.supported ? (
            <Microphone size={20} weight={speech.listening ? "fill" : "regular"} />
          ) : (
            <MicrophoneSlash size={20} />
          )}
        </Button>
      )}

      <VoiceConfirmDialog
        open={dialogOpen}
        fieldLabel={label}
        transcript={speech.finalTranscript}
        listening={speech.listening}
        interim={speech.interim}
        error={speech.error}
        kind={kind}
        options={options}
        records={records}
        getLabel={getLabel}
        getSearchText={getSearchText}
        confirmLabel="Confirmar"
        onConfirm={handleConfirm}
        onRetry={handleRetry}
        onCancel={closeDialog}
      />
    </div>
  );
}
