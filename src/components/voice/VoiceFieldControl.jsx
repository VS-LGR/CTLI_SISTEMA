import React, { useCallback, useEffect, useState } from "react";
import { Microphone, MicrophoneSlash } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useSpeechToText } from "@/hooks/useSpeechToText";
import VoiceConfirmDialog from "@/components/voice/VoiceConfirmDialog";

/**
 * Input com microfone (Modo 1): clica → fala → confirma/refaz/cancela.
 */
export default function VoiceFieldControl({
  value = "",
  onChange,
  onConfirmValue,
  label = "Valor",
  placeholder,
  disabled = false,
  voiceEnabled = false,
  className,
  inputClassName,
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

  useEffect(() => {
    if (!dialogOpen) return;
    if (speech.finalTranscript && !speech.listening) {
      // transcript pronto — permanece no dialog para confirmação
    }
  }, [dialogOpen, speech.finalTranscript, speech.listening]);

  const handleConfirm = (parsedValue) => {
    if (onConfirmValue) onConfirmValue(parsedValue);
    else if (onChange) onChange(parsedValue);
    closeDialog();
  };

  const handleRetry = () => {
    speech.clearTranscript();
    speech.start();
  };

  return (
    <div className={cn("flex items-center gap-1 min-w-0", className)}>
      <Input
        {...inputProps}
        disabled={disabled}
        placeholder={placeholder}
        className={cn("min-w-0 flex-1", inputClassName)}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
      />
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
        onConfirm={handleConfirm}
        onRetry={handleRetry}
        onCancel={closeDialog}
      />
    </div>
  );
}
