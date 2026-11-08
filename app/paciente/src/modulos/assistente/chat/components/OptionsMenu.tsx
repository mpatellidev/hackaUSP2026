import { useEffect, useId, useRef, useState } from "react";
import type { Prefs } from "../hooks/usePrefs";
import { browserTTS } from "../hooks/useSpeech";
import { CloseIcon, LogoutIcon, MenuIcon, UserIcon } from "./icons";

interface Props {
  prefs: Prefs;
  onChange: (patch: Partial<Prefs>) => void;
  onEditProfile?: () => void;
  /** sem isso, o menu não mostra "Sair" (o login é responsabilidade do site) */
  onLogout?: () => void;
  /** troca a forma de atendimento (conversa guiada ↔ telas do app) */
  trocarModo?: { rotulo: string; acao: () => void };
  userName: string;
}

const MIN_SCALE = 0.9;
const MAX_SCALE = 2;

function Switch({ label, checked, onToggle }: { label: string; checked: boolean; onToggle: () => void }) {
  return (
    <button type="button" role="switch" aria-checked={checked} className="menu-row menu-switch" onClick={onToggle}>
      <span>{label}</span>
      <span className="switch" aria-hidden="true">
        <span className="switch-knob" />
      </span>
    </button>
  );
}

/** Menu (hambúrguer) com as opções de acessibilidade e da conta, escondidas até a pessoa pedir. */
export function OptionsMenu({ prefs, onChange, onEditProfile, onLogout, trocarModo, userName }: Props) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    wrapRef.current?.querySelector<HTMLElement>(".menu-panel button")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    const onClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  const scale = (delta: number) =>
    onChange({ font_scale: Math.min(MAX_SCALE, Math.max(MIN_SCALE, +(prefs.font_scale + delta).toFixed(2))) });

  const run = (fn: () => void) => () => {
    setOpen(false);
    fn();
  };

  return (
    <div className="menu" ref={wrapRef}>
      <button
        ref={buttonRef}
        type="button"
        className="icon-btn"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <CloseIcon /> : <MenuIcon />}
        <span className="sr-only">{open ? "Fechar opções" : "Opções e acessibilidade"}</span>
      </button>

      <div id={panelId} className="menu-panel" hidden={!open}>
        <p className="menu-hello">Olá, {userName}</p>

        <div className="menu-section" role="group" aria-labelledby={`${panelId}-a11y`}>
          <p id={`${panelId}-a11y`} className="menu-heading">
            Acessibilidade
          </p>
          <div className="menu-row">
            <span id={`${panelId}-size`}>Tamanho do texto</span>
            <div className="stepper" role="group" aria-labelledby={`${panelId}-size`}>
              <button type="button" onClick={() => scale(-0.15)} disabled={prefs.font_scale <= MIN_SCALE} aria-label="Diminuir texto">
                A−
              </button>
              <span aria-live="polite">{Math.round(prefs.font_scale * 100)}%</span>
              <button type="button" onClick={() => scale(0.15)} disabled={prefs.font_scale >= MAX_SCALE} aria-label="Aumentar texto">
                A+
              </button>
            </div>
          </div>
          <Switch
            label="Alto contraste"
            checked={prefs.high_contrast}
            onToggle={() => onChange({ high_contrast: !prefs.high_contrast })}
          />
          <Switch label="Libras" checked={prefs.vlibras} onToggle={() => onChange({ vlibras: !prefs.vlibras })} />
          <Switch
            label="Ler respostas em voz alta"
            checked={prefs.audio_mode}
            onToggle={() => {
              if (prefs.audio_mode) browserTTS.stop(); // desligou: para o que estiver tocando
              onChange({ audio_mode: !prefs.audio_mode });
            }}
          />
          {prefs.audio_mode && (
            <Switch
              label="Tocar áudio sozinho"
              checked={prefs.auto_play_audio}
              onToggle={() => onChange({ auto_play_audio: !prefs.auto_play_audio })}
            />
          )}
        </div>

        <div className="menu-section">
          {trocarModo && (
            <button type="button" className="menu-row menu-action" onClick={run(trocarModo.acao)}>
              {trocarModo.rotulo}
            </button>
          )}
          {onEditProfile && (
            <button type="button" className="menu-row menu-action" onClick={run(onEditProfile)}>
              <UserIcon /> Atualizar meus dados
            </button>
          )}
          {onLogout && (
            <button type="button" className="menu-row menu-action" onClick={run(onLogout)}>
              <LogoutIcon /> Sair
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
