import { useEffect, useRef, useState, type CSSProperties } from "react";
import { audioUrl, type AudioPayload } from "../api/client";
import { browserTTS } from "../hooks/useSpeech";
import { PauseIcon, PlayFilledIcon } from "./icons";

// ---------- Coordenação entre players: só um áudio toca por vez ----------
// Áudios com reprodução automática entram numa fila e tocam em sequência.

interface Player {
  id: string;
  stop: () => void;
}
let active: Player | null = null;
const queue: { id: string; start: () => void }[] = [];
/** mensagens que já tocaram sozinhas (não repetir ao remontar o balão) */
const autoPlayed = new Set<string>();

function claim(p: Player, manual: boolean) {
  if (manual) queue.length = 0; // tocar algo à mão cancela a fila automática
  if (active && active.id !== p.id) active.stop();
  active = p;
}
function release(id: string, finished: boolean) {
  if (active?.id !== id) return;
  active = null;
  if (finished) queue.shift()?.start();
}
function enqueue(id: string, start: () => void) {
  if (active) queue.push({ id, start });
  else start();
}
function dequeue(id: string) {
  const i = queue.findIndex((q) => q.id === id);
  if (i >= 0) queue.splice(i, 1);
}

// ---------- Helpers ----------

/** caracteres falados por segundo pela voz do navegador (estimativa) */
const CHARS_PER_SEC = 14;

function fmt(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) sec = 0;
  const s = Math.round(sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** volta até o início da palavra, para retomar a fala sem cortar sílabas */
function wordStart(text: string, i: number): number {
  while (i > 0 && !/\s/.test(text[i - 1])) i--;
  return i;
}

interface Props {
  /** id da mensagem: identifica o player na fila */
  id: string;
  audio: AudioPayload;
  autoPlay: boolean;
}

/**
 * Mensagem de voz no estilo WhatsApp: botão play/pausa, barra com uma bolinha
 * que mostra (e permite mudar) quanto já foi tocado, e o tempo.
 * Usa o MP3 do servidor quando houver; senão, a voz do navegador.
 */
export function AudioMessage({ id, audio, autoPlay }: Props) {
  const text = audio.text;
  const estimated = text.length / (CHARS_PER_SEC * browserTTS.rate);
  const [mode, setMode] = useState<"file" | "tts">(audio.url ? "file" : "tts");
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0..1
  const [duration, setDuration] = useState(estimated);

  const elRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef(0);
  const ttsToken = useRef(0);
  const seekTimer = useRef(0);
  const progressRef = useRef(0);
  progressRef.current = progress;

  const stopLoop = () => cancelAnimationFrame(rafRef.current);

  const finish = (completed: boolean) => {
    stopLoop();
    setPlaying(false);
    if (completed) setProgress(0); // como no WhatsApp: ao terminar, volta ao início
    release(id, completed);
  };

  // ----- arquivo de áudio -----
  const getEl = () => {
    if (elRef.current || !audio.url) return elRef.current;
    const el = new Audio(audioUrl(audio.url));
    el.preload = "metadata";
    el.onloadedmetadata = () => Number.isFinite(el.duration) && setDuration(el.duration);
    el.onended = () => finish(true);
    elRef.current = el;
    return el;
  };

  const playFile = (from: number, manual: boolean) => {
    const el = getEl();
    if (!el) return playTts(from, manual);
    claim({ id, stop: pause }, manual);
    stopLoop();
    // ainda sem duração (primeiro play): posiciona assim que o arquivo informar o tamanho
    if (Number.isFinite(el.duration)) el.currentTime = from * el.duration;
    else el.addEventListener("loadedmetadata", () => (el.currentTime = from * el.duration), { once: true });
    setPlaying(true);
    el.play()
      .then(() => {
        const tick = () => {
          if (el.duration) setProgress(el.currentTime / el.duration);
          rafRef.current = requestAnimationFrame(tick);
        };
        tick();
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return; // pausado antes de começar
        // autoplay bloqueado ou arquivo indisponível: usa a voz do navegador
        setMode("tts");
        setDuration(estimated);
        playTts(from, manual);
      });
  };

  // ----- voz do navegador -----
  const playTts = (from: number, manual: boolean) => {
    if (!browserTTS.supported) return;
    claim({ id, stop: pause }, manual);
    stopLoop();
    const token = ++ttsToken.current;
    const offset = wordStart(text, Math.floor(from * text.length));
    const startedAt = performance.now();
    let spokenChar = -1; // posição informada pela própria voz (quando o navegador informa)

    browserTTS.speak(
      text.slice(offset),
      () => token === ttsToken.current && finish(true),
      (ci) => {
        if (token === ttsToken.current) spokenChar = offset + ci;
      },
    );
    setPlaying(true);
    setProgress(offset / text.length);

    const tick = () => {
      const byTime = offset + ((performance.now() - startedAt) / 1000) * CHARS_PER_SEC * browserTTS.rate;
      const pos = spokenChar >= 0 ? spokenChar : byTime;
      setProgress(Math.min(pos / text.length, 0.99));
      rafRef.current = requestAnimationFrame(tick);
    };
    tick();
  };

  const play = (from: number, manual: boolean) => (mode === "file" ? playFile(from, manual) : playTts(from, manual));

  function pause() {
    clearTimeout(seekTimer.current);
    ttsToken.current++; // ignora o "fim" disparado pelo cancelamento
    elRef.current?.pause();
    browserTTS.stop(); // só o player ativo é pausado, então não interrompe outro áudio
    finish(false);
  }

  /** clicar/arrastar na barra: toca a partir daquele ponto (tocando ou não) */
  const seek = (value: number) => {
    setProgress(value);
    progressRef.current = value;

    if (mode === "file" && audio.url) {
      const el = elRef.current;
      if (playing && el && Number.isFinite(el.duration)) el.currentTime = value * el.duration;
      else playFile(value, true);
      return;
    }

    // Voz do navegador: não dá para "pular" a fala, então ela recomeça do ponto escolhido.
    // Espera o arrasto terminar e dá um respiro entre cancelar e falar de novo
    // (no Chrome, falar logo após cancelar às vezes não sai som nenhum).
    if (!browserTTS.supported) return;
    claim({ id, stop: pause }, true);
    stopLoop();
    ttsToken.current++;
    browserTTS.stop();
    setPlaying(true);
    clearTimeout(seekTimer.current);
    seekTimer.current = window.setTimeout(() => playTts(progressRef.current, true), 150);
  };

  // Reprodução automática (adiada um tique para sobreviver à montagem dupla do StrictMode).
  useEffect(() => {
    let timer = 0;
    if (autoPlay && !autoPlayed.has(id)) {
      timer = window.setTimeout(() => {
        autoPlayed.add(id);
        enqueue(id, () => play(0, false));
      });
    }
    return () => {
      clearTimeout(timer);
      clearTimeout(seekTimer.current);
      dequeue(id);
      if (active?.id === id) active.stop();
      stopLoop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canPlay = !!audio.url || browserTTS.supported;
  const elapsed = progress * duration;
  const timeLabel = playing || progress > 0 ? fmt(elapsed) : fmt(duration);

  return (
    <div className="voice" style={{ "--p": `${progress * 100}%` } as CSSProperties}>
      <button
        type="button"
        className="voice-play"
        onClick={() => (playing ? pause() : play(progressRef.current, true))}
        disabled={!canPlay}
        aria-label={playing ? "Pausar áudio" : "Ouvir áudio"}
      >
        {playing ? <PauseIcon /> : <PlayFilledIcon />}
      </button>
      <div className="voice-main">
        <input
          type="range"
          className="voice-track"
          min={0}
          max={1000}
          step={1}
          value={Math.round(progress * 1000)}
          onChange={(e) => seek(Number(e.target.value) / 1000)}
          disabled={!canPlay}
          aria-label="Posição do áudio"
          aria-valuetext={`${fmt(elapsed)} de ${fmt(duration)}`}
        />
        <span className="voice-time" aria-hidden="true">
          {timeLabel}
        </span>
      </div>
    </div>
  );
}
