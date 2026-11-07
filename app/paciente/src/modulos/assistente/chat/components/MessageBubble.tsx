import { useId, useState } from "react";
import type { AudioPayload } from "../api/client";
import { AudioMessage } from "./AudioMessage";
import { Avatar, UserAvatar } from "./icons";

export interface UiMessage {
  id: string;
  from: "bot" | "user";
  text: string;
  at: number;
  audio?: AudioPayload | null;
  autoPlay?: boolean;
  error?: boolean;
}

interface Props {
  msg: UiMessage;
  /** primeira / última mensagem de uma sequência do mesmo remetente */
  first: boolean;
  last: boolean;
  /** quem prefere áudio recebe as respostas como mensagem de voz */
  showAudio: boolean;
  userName: string;
  /** MOCK: foto da pessoa (a API ainda não envia) */
  userPhoto?: string | null;
}

const timeFmt = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" });

export function MessageBubble({ msg, first, last, showAudio, userName, userPhoto }: Props) {
  const [showTranscript, setShowTranscript] = useState(false);
  const transcriptId = useId();
  const isBot = msg.from === "bot";

  // Modo áudio: a resposta vira mensagem de voz; o texto fica atrás de "Ver transcrição".
  // Mensagens de erro continuam com o texto sempre visível.
  const asVoice = isBot && showAudio && !msg.error;
  const audio: AudioPayload = msg.audio ?? { text: msg.text, url: null };
  // se o áudio explica algo além do texto do balão, a transcrição mostra os dois
  const extraAudioText = audio.text.trim() !== msg.text.trim() ? audio.text : null;

  return (
    <li className={`msg ${isBot ? "msg-bot" : "msg-user"} ${first ? "is-first" : ""} ${msg.error ? "msg-error" : ""}`}>
      {isBot && first && (
        <p className="msg-name" aria-hidden="true">
          Assistente
        </p>
      )}
      <div className="msg-row">
        <span className="avatar-slot">
          {last && (isBot ? <Avatar size={32} /> : <UserAvatar name={userName} src={userPhoto} size={32} />)}
        </span>
        <div className={`bubble ${asVoice ? "bubble-voice" : ""}`}>
          <span className="sr-only">{isBot ? "Assistente disse:" : "Você disse:"}</span>
          {asVoice ? (
            <>
              <AudioMessage id={msg.id} audio={audio} autoPlay={!!msg.autoPlay} />
              <button
                type="button"
                className="transcript-toggle"
                aria-expanded={showTranscript}
                aria-controls={transcriptId}
                onClick={() => setShowTranscript((v) => !v)}
              >
                {showTranscript ? "Ocultar transcrição" : "Ver transcrição"}
              </button>
              <div id={transcriptId} className="transcript" hidden={!showTranscript}>
                <p className="msg-text">{msg.text}</p>
                {extraAudioText && <p className="msg-text transcript-extra">{extraAudioText}</p>}
              </div>
            </>
          ) : (
            <>
              <p className="msg-text">{msg.text}</p>
              {isBot && showAudio && <AudioMessage id={msg.id} audio={audio} autoPlay={!!msg.autoPlay} />}
            </>
          )}
        </div>
        {last && (
          <time className="msg-time" dateTime={new Date(msg.at).toISOString()}>
            {timeFmt.format(msg.at)}
          </time>
        )}
      </div>
    </li>
  );
}
