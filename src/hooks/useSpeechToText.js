import { useCallback, useEffect, useRef, useState } from "react";
import {
  createSpeechRecognition,
  isSpeechRecognitionSupported,
  speechErrorMessage,
} from "@/lib/voice/speechRecognition";

/**
 * Hook de ditado pontual (pt-BR) via Web Speech API.
 */
export function useSpeechToText({ lang = "pt-BR", enabled = true } = {}) {
  const supported = isSpeechRecognitionSupported();
  const recognitionRef = useRef(null);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [finalTranscript, setFinalTranscript] = useState("");
  const [error, setError] = useState("");

  const stop = useCallback(() => {
    try {
      recognitionRef.current?.stop();
    } catch {
      /* ignore */
    }
    recognitionRef.current = null;
    setListening(false);
  }, []);

  const abort = useCallback(() => {
    try {
      recognitionRef.current?.abort();
    } catch {
      /* ignore */
    }
    recognitionRef.current = null;
    setListening(false);
    setInterim("");
  }, []);

  const start = useCallback(() => {
    if (!enabled || !supported) {
      setError("Reconhecimento de voz não suportado neste navegador.");
      return false;
    }
    abort();
    setError("");
    setInterim("");
    setFinalTranscript("");

    const recognition = createSpeechRecognition({ lang, interimResults: true });
    if (!recognition) {
      setError("Reconhecimento de voz não disponível.");
      return false;
    }

    recognitionRef.current = recognition;

    recognition.onstart = () => setListening(true);
    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };
    recognition.onerror = (event) => {
      const msg = speechErrorMessage(event?.error);
      if (msg) setError(msg);
      setListening(false);
    };
    recognition.onresult = (event) => {
      let interimBuf = "";
      let finalBuf = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const text = result?.[0]?.transcript || "";
        if (result.isFinal) finalBuf += text;
        else interimBuf += text;
      }
      if (interimBuf) setInterim(interimBuf.trim());
      if (finalBuf) {
        const cleaned = finalBuf.trim();
        setFinalTranscript(cleaned);
        setInterim("");
      }
    };

    try {
      recognition.start();
      return true;
    } catch (e) {
      setError(e?.message || "Não foi possível iniciar o microfone.");
      setListening(false);
      return false;
    }
  }, [abort, enabled, lang, supported]);

  useEffect(() => () => abort(), [abort]);

  const clearTranscript = useCallback(() => {
    setFinalTranscript("");
    setInterim("");
    setError("");
  }, []);

  return {
    supported,
    listening,
    interim,
    finalTranscript,
    error,
    start,
    stop,
    abort,
    clearTranscript,
    setError,
  };
}
