import { useCallback, useEffect, useRef, useState } from "react";
import { ErroApi } from "@uhealth/api-client";
import { api, type ChatUser, type ProfileIn } from "./api/client";
import { Avatar } from "./components/icons";
import { Composer } from "./components/Composer";
import { MessageBubble, type UiMessage } from "./components/MessageBubble";
import { OptionsMenu } from "./components/OptionsMenu";
import { QuickReplies } from "./components/QuickReplies";
import { VLibras } from "./components/VLibras";
import { configureChat, type ChatConfig } from "./config";
import { usePrefs } from "./hooks/usePrefs";
import { browserTTS } from "./hooks/useSpeech";
import { buildProfile, CONTINUE, PROFILE_STEPS, UPDATE, type Option } from "./onboarding/profileFlow";

type Phase = "loading" | "confirm" | "onboarding" | "chat";

interface Replies {
  options: Option[];
  multi?: boolean;
  exclusive?: string[];
  title?: string;
}

const START_OPTIONS: Option[] = [
  { label: "Encontrar uma clínica", value: "Quais clínicas existem?" },
  { label: "Ver meus pedidos", value: "Como estão meus pedidos?" },
  { label: "Atendimentos confirmados", value: "Quais são meus agendamentos?" },
];

export interface ChatAppProps extends Pick<ChatConfig, "api">, Partial<Pick<ChatConfig, "logoUrl">> {
  /** pessoa logada (nome e foto) */
  user: ChatUser;
  /** se informado, o menu mostra "Sair" */
  onLogout?: () => void;
}

/**
 * Assistente acessível do UHealth (#9). Independente do site: só conversa com o backend
 * (perfil, chat, áudio) usando o token e o endereço recebidos aqui.
 * Ajuda a encontrar clínicas, enviar pedidos e acompanhá-los. Não marca horário: pedido ≠ agendamento.
 */
export function ChatApp({ user, onLogout, api: clienteApi, logoUrl }: ChatAppProps) {
  configureChat({ api: clienteApi, logoUrl });
  const { prefs, update, applySuggested } = usePrefs();
  const [phase, setPhase] = useState<Phase>("loading");
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [replies, setReplies] = useState<Replies | null>(null);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(0);
  const answers = useRef<Partial<Record<keyof ProfileIn, string | string[]>>>({});
  const conversationId = useRef<string | null>(null);
  const [fonte, setFonte] = useState<string | null>(null);
  const idSeq = useRef(0);
  const endRef = useRef<HTMLDivElement>(null);
  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;

  const push = useCallback((m: Omit<UiMessage, "id" | "at">) => {
    setMessages((prev) => [...prev, { ...m, id: String(++idSeq.current), at: Date.now() }]);
  }, []);

  const bot = useCallback(
    (text: string, extra: Partial<UiMessage> = {}) => {
      // Com áudio automático, o próprio player da mensagem toca (em fila, um por vez).
      const { audio_mode, auto_play_audio } = prefsRef.current;
      push({ from: "bot", text, autoPlay: audio_mode && auto_play_audio && !extra.error, ...extra });
    },
    [push],
  );

  // ---------- Onboarding do perfil ----------
  const askStep = useCallback(
    (i: number) => {
      const s = PROFILE_STEPS[i];
      setStep(i);
      bot(`Pergunta ${i + 1} de ${PROFILE_STEPS.length}: ${s.question}`);
      setReplies({ options: s.options, multi: s.multi, exclusive: s.exclusive, title: s.question });
    },
    [bot],
  );

  const startOnboarding = useCallback(() => {
    answers.current = {};
    setPhase("onboarding");
    bot(
      `Vou fazer ${PROFILE_STEPS.length} perguntas rápidas para eu explicar as coisas do jeito que for melhor para você. ` +
        "Suas respostas ficam salvas e você pode mudar quando quiser.",
    );
    askStep(0);
  }, [askStep, bot]);

  const startChat = useCallback(() => {
    setPhase("chat");
    bot(
      "Como posso ajudar? Posso mostrar clínicas-escola de saúde, enviar um pedido de atendimento " +
        "e contar como estão seus pedidos.",
    );
    setReplies({ options: START_OPTIONS, title: "Atalhos" });
  }, [bot]);

  // Saiu do chat (ex.: logout no site): não deixa a voz falando sozinha.
  useEffect(() => () => browserTTS.stop(), []);

  // ---------- Início: perfil salvo? ----------
  // Roda uma vez por montagem: para trocar de pessoa, o site remonta o chat (key={user.id}).
  useEffect(() => {
    let cancelled = false;
    const greeting = `Olá, ${user.nome}! Sou a assistente do UHealth.`;
    api
      .getProfile()
      .then((p) => {
        if (cancelled) return;
        applySuggested(p.ui_prefs, p.prefere_audio);
        setPhase("confirm");
        bot(`${greeting} Encontrei seus dados salvos: ${p.resumo}. Quer continuar com eles ou atualizar?`);
        setReplies({ options: [CONTINUE, UPDATE], title: "Seus dados" });
      })
      .catch((err) => {
        if (cancelled) return;
        bot(greeting);
        if (err instanceof ErroApi && err.status === 404) startOnboarding();
        else bot("Não consegui carregar seus dados. Recarregue a página para tentar de novo.", { error: true });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Rola até a última mensagem.
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    endRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "end" });
  }, [messages, replies, busy]);

  // ---------- Conversa com a IA ----------
  const sendToAI = async (text: string) => {
    push({ from: "user", text });
    setReplies(null);
    setBusy(true);
    try {
      const res = await api.chat(text, conversationId.current);
      conversationId.current = res.conversation_id;
      setFonte(res.fonte);
      applySuggested(res.ui_prefs);
      const autoPlay = prefsRef.current.audio_mode && prefsRef.current.auto_play_audio;
      res.messages.forEach((m) => push({ from: "bot", text: m.text, audio: m.audio, autoPlay }));
      setReplies(res.quick_replies.length ? { options: res.quick_replies, title: "Escolha uma opção ou escreva" } : null);
    } catch (err) {
      bot(err instanceof ErroApi ? err.message : "Sem conexão. Verifique sua internet e tente de novo.", {
        error: true,
      });
    } finally {
      setBusy(false);
    }
  };

  const onReply = async (values: string[], labels: string[]) => {
    if (phase === "confirm") {
      push({ from: "user", text: labels[0] });
      setReplies(null);
      if (values[0] === CONTINUE.value) startChat();
      else startOnboarding();
      return;
    }
    if (phase === "onboarding") {
      const s = PROFILE_STEPS[step];
      push({ from: "user", text: labels.join(", ") });
      answers.current[s.key] = s.multi ? values : values[0];
      setReplies(null);
      if (step + 1 < PROFILE_STEPS.length) {
        askStep(step + 1);
        return;
      }
      setBusy(true);
      try {
        const saved = await api.saveProfile(buildProfile(answers.current));
        applySuggested(saved.ui_prefs, saved.prefere_audio);
        prefsRef.current = { ...prefsRef.current, auto_play_audio: saved.ui_prefs.auto_play_audio };
        bot("Pronto, guardei suas preferências.");
        startChat();
      } catch {
        bot("Não consegui salvar suas respostas. Vamos tentar de novo.", { error: true });
        startOnboarding();
      } finally {
        setBusy(false);
      }
      return;
    }
    await sendToAI(values[0]);
  };

  const onSend = (text: string) => {
    if (phase === "chat") void sendToAI(text);
  };

  const inChat = phase === "chat";
  // Respostas em voz: segue o interruptor do menu (sugerido pelo perfil, a pessoa pode mudar).
  const showAudio = prefs.audio_mode;
  const today = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", year: "numeric" }).format(new Date());

  return (
    <div className="chat-app">
      <a href="#composer-input" className="skip-link">
        Pular para a caixa de mensagem
      </a>
      <div className="chat-card">
        <header className="chat-header">
          <Avatar size={40} />
          <h1>Assistente UHealth</h1>
          <OptionsMenu
            prefs={prefs}
            onChange={update}
            onLogout={onLogout}
            userName={user.nome}
            onEditProfile={inChat && !busy ? () => startOnboarding() : undefined}
          />
        </header>
        {/* Texto fixo: não depende de rede, IA, vaga ou fila (contrato §9.4). */}
        <p className="chat-notice" role="note">
          <strong>Demonstração</strong> · dados fictícios. Não diagnostica e não substitui atendimento médico.
          Emergência: ligue <a href="tel:192">192 (SAMU)</a>.
          {fonte === "mock" && " Respostas automáticas, sem IA."}
        </p>
        <main className="chat-body" id="conteudo">
          <h2 className="sr-only">Conversa</h2>
          <p className="date-divider">
            <span>{today}</span>
          </p>
          <ol className="messages" role="log" aria-live="polite" aria-relevant="additions" aria-label="Mensagens">
            {messages.map((m, i) => (
              <MessageBubble
                key={m.id}
                msg={m}
                first={i === 0 || messages[i - 1].from !== m.from}
                last={i === messages.length - 1 || messages[i + 1].from !== m.from}
                showAudio={showAudio}
                userName={user.nome}
                userPhoto={user.foto_url}
              />
            ))}
          </ol>
          {busy && (
            <div className="typing" role="status">
              <Avatar size={32} />
              <span className="bubble">
                <span className="dots" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>
                <span className="sr-only">Assistente está escrevendo…</span>
              </span>
            </div>
          )}
          {replies && !busy && (
            <QuickReplies
              key={`${phase}-${step}-${messages.length}`}
              options={replies.options}
              multi={replies.multi}
              exclusive={replies.exclusive}
              title={replies.title}
              onSelect={onReply}
            />
          )}
          <div ref={endRef} />
        </main>
        <footer className="chat-footer">
          <Composer
            onSend={onSend}
            disabled={!inChat || busy}
            placeholder={inChat ? "Escreva sua mensagem" : "Escolha uma opção acima"}
          />
        </footer>
      </div>
      <VLibras enabled={prefs.vlibras} />
    </div>
  );
}
