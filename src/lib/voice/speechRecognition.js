/** Web Speech API — guards e factory (Chrome/Edge). */

export function getSpeechRecognitionConstructor() {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

export function isSpeechRecognitionSupported() {
  return Boolean(getSpeechRecognitionConstructor());
}

/**
 * @param {object} [opts]
 * @param {string} [opts.lang]
 * @param {boolean} [opts.interimResults]
 * @param {number} [opts.maxAlternatives]
 * @returns {SpeechRecognition|null}
 */
export function createSpeechRecognition(opts = {}) {
  const Ctor = getSpeechRecognitionConstructor();
  if (!Ctor) return null;
  const recognition = new Ctor();
  recognition.lang = opts.lang || "pt-BR";
  recognition.interimResults = opts.interimResults !== false;
  recognition.maxAlternatives = opts.maxAlternatives ?? 1;
  recognition.continuous = false;
  return recognition;
}

export function speechErrorMessage(errorCode) {
  switch (errorCode) {
    case "not-allowed":
    case "service-not-allowed":
      return "Permissão de microfone negada. Autorize o microfone no navegador.";
    case "no-speech":
      return "Nenhuma fala detectada. Tente novamente.";
    case "audio-capture":
      return "Não foi possível aceder ao microfone.";
    case "network":
      return "Erro de rede no reconhecimento de voz.";
    case "aborted":
      return "";
    default:
      return errorCode ? `Erro de voz: ${errorCode}` : "Falha no reconhecimento de voz.";
  }
}
