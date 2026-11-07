import { useCallback, useEffect, useRef, useState } from "react";

// ---------- Texto -> fala (fallback do navegador) ----------

function pickVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis?.getVoices() ?? [];
  return voices.find((v) => v.lang === "pt-BR") ?? voices.find((v) => v.lang.startsWith("pt"));
}

export const browserTTS = {
  supported: typeof window !== "undefined" && "speechSynthesis" in window,
  /** velocidade da fala; usada também para estimar a duração do áudio */
  rate: 0.95,
  speak(text: string, onEnd?: () => void, onBoundary?: (charIndex: number) => void) {
    if (!this.supported) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "pt-BR";
    u.rate = this.rate;
    const voice = pickVoice();
    if (voice) u.voice = voice;
    if (onEnd) {
      u.onend = onEnd;
      u.onerror = onEnd;
    }
    if (onBoundary) u.onboundary = (e) => onBoundary(e.charIndex);
    window.speechSynthesis.speak(u);
  },
  stop() {
    if (this.supported) window.speechSynthesis.cancel();
  },
};

// ---------- Fala -> texto (ditado) ----------

// A Web Speech API ainda não tem tipos no lib.dom padrão.
type RecognitionCtor = new () => {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  start(): void;
  stop(): void;
};

const Recognition: RecognitionCtor | undefined =
  typeof window !== "undefined"
    ? ((window as unknown as Record<string, RecognitionCtor | undefined>).SpeechRecognition ??
      (window as unknown as Record<string, RecognitionCtor | undefined>).webkitSpeechRecognition)
    : undefined;

export function useSpeechRecognition(onText: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<InstanceType<RecognitionCtor> | null>(null);
  const cbRef = useRef(onText);
  cbRef.current = onText;

  useEffect(() => () => recRef.current?.stop(), []);

  const start = useCallback(() => {
    if (!Recognition) return;
    browserTTS.stop(); // não ouvir a própria voz do assistente
    const rec = new Recognition();
    rec.lang = "pt-BR";
    rec.interimResults = false;
    rec.continuous = false;
    rec.onresult = (e) => {
      const text = Array.from(e.results)
        .map((r) => r[0].transcript)
        .join(" ")
        .trim();
      if (text) cbRef.current(text);
    };
    rec.onerror = (e) =>
      setError(e.error === "not-allowed" ? "Permita o uso do microfone para falar." : "Não consegui ouvir. Tente de novo.");
    rec.onend = () => setListening(false);
    recRef.current = rec;
    setError(null);
    setListening(true);
    rec.start();
  }, []);

  const stop = useCallback(() => recRef.current?.stop(), []);

  return { supported: !!Recognition, listening, error, start, stop };
}
