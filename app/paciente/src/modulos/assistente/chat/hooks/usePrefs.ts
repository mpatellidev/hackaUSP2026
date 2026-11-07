import { useCallback, useEffect, useState } from "react";
import type { UiPrefs } from "../api/client";

export type Prefs = Pick<UiPrefs, "auto_play_audio" | "font_scale" | "high_contrast" | "vlibras"> & {
  /** respostas do assistente como mensagem de voz (texto atrás de "Ver transcrição") */
  audio_mode: boolean;
};

const DEFAULTS: Prefs = { audio_mode: false, auto_play_audio: false, font_scale: 1, high_contrast: false, vlibras: false };
const KEY = "chat_prefs_override";

function loadOverrides(): Partial<Prefs> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}");
  } catch {
    return {};
  }
}

/**
 * Preferências de interface = sugestões vindas do perfil (servidor)
 * + ajustes manuais da pessoa na barra de acessibilidade (têm prioridade, ficam no navegador).
 */
export function usePrefs() {
  const [suggested, setSuggested] = useState<Prefs>(DEFAULTS);
  const [overrides, setOverrides] = useState<Partial<Prefs>>(loadOverrides);
  const prefs: Prefs = { ...suggested, ...overrides };

  const update = useCallback((patch: Partial<Prefs>) => {
    setOverrides((prev) => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* sem armazenamento: vale só nesta sessão */
      }
      return next;
    });
  }, []);

  /** `prefereAudio` vem do perfil; quando omitido, mantém a sugestão anterior. */
  const applySuggested = useCallback((ui: UiPrefs, prefereAudio?: boolean) => {
    setSuggested((prev) => ({
      audio_mode: (prefereAudio ?? prev.audio_mode) || ui.auto_play_audio,
      auto_play_audio: ui.auto_play_audio,
      font_scale: ui.font_scale,
      high_contrast: ui.high_contrast,
      vlibras: ui.vlibras,
    }));
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--font-scale", String(prefs.font_scale));
    root.dataset.contrast = prefs.high_contrast ? "high" : "normal";
    root.dataset.libras = prefs.vlibras ? "on" : "off";
  }, [prefs.font_scale, prefs.high_contrast, prefs.vlibras]);

  return { prefs, update, applySuggested };
}
