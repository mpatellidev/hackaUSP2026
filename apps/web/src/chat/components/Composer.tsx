import { useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useSpeechRecognition } from "../hooks/useSpeech";
import { MicIcon, SendIcon } from "./icons";

interface Props {
  onSend: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function Composer({ onSend, disabled, placeholder = "Escreva sua mensagem" }: Props) {
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const mic = useSpeechRecognition((spoken) => {
    // Envia direto o que foi falado: menos passos para quem tem dificuldade motora ou visual.
    onSend(spoken);
  });

  const resize = () => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    const t = text.trim();
    if (!t || disabled) return;
    onSend(t);
    setText("");
    requestAnimationFrame(resize);
    inputRef.current?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <form className="composer" onSubmit={submit}>
      <div className="composer-field">
        <label htmlFor="composer-input" className="sr-only">
          Sua mensagem
        </label>
        <textarea
          id="composer-input"
          ref={inputRef}
          rows={1}
          value={text}
          placeholder={placeholder}
          onChange={(e) => {
            setText(e.target.value);
            resize();
          }}
          onKeyDown={onKeyDown}
          disabled={disabled}
          aria-describedby="composer-hint"
        />
        <span id="composer-hint" className="sr-only">
          Aperte Enter para enviar. Shift mais Enter para pular linha.
        </span>
        {mic.supported && (
          <button
            type="button"
            className={`icon-btn ${mic.listening ? "is-listening" : ""}`}
            onClick={mic.listening ? mic.stop : mic.start}
            disabled={disabled}
            aria-pressed={mic.listening}
          >
            <MicIcon />
            <span className="sr-only">{mic.listening ? "Ouvindo. Toque para parar" : "Falar"}</span>
          </button>
        )}
      </div>
      <button type="submit" className="send-btn" disabled={disabled || !text.trim()}>
        <SendIcon />
        <span className="sr-only">Enviar</span>
      </button>
      {mic.listening && (
        <p className="composer-note" role="status">
          Ouvindo… fale agora.
        </p>
      )}
      {mic.error && (
        <p className="composer-note composer-error" role="alert">
          {mic.error}
        </p>
      )}
    </form>
  );
}
