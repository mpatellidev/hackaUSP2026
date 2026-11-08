import { useEffect, useState } from "react";
import type { Api } from "@uhealth/api-client";

/**
 * Modo de uso escolhido depois do login (salvo no perfil do servidor e lembrado neste aparelho):
 * - "conversa": a assistente conduz tudo e vira a única tela;
 * - "telas": o painel manual (o paciente faz sozinho).
 * Os dois fazem as mesmas coisas com as mesmas requisições ao backend.
 */
export type ModoAtendimento = "conversa" | "telas";

const CHAVE = "uh-modo-atendimento";
const EVENTO = "uh-modo-atendimento";

export const NOME_MODO: Record<ModoAtendimento, string> = {
  conversa: "Quero ajuda da assistente",
  telas: "Prefiro fazer sozinho",
};
/** Texto do botão de troca, sempre visível. */
export const TROCAR_PARA: Record<ModoAtendimento, string> = {
  conversa: "Usar a assistente",
  telas: "Fazer sozinho",
};

/** null = ainda não escolheu (mostra a tela de escolha). */
export function lerModo(): ModoAtendimento | null {
  try {
    const v = localStorage.getItem(CHAVE);
    return v === "conversa" || v === "telas" ? v : null;
  } catch { return null; }
}

/** Só neste aparelho (ex.: ao trazer a escolha que já estava salva no perfil). */
export function gravarModo(modo: ModoAtendimento | null) {
  try { if (modo) localStorage.setItem(CHAVE, modo); else localStorage.removeItem(CHAVE); } catch { /* só não lembra */ }
  window.dispatchEvent(new CustomEvent<ModoAtendimento | null>(EVENTO, { detail: modo }));
}

/** Escolha do paciente: vale na hora e fica salva no perfil (PUT /perfil/modo). */
export function salvarModo(api: Api, modo: ModoAtendimento) {
  gravarModo(modo);
  void api.dados(api.cliente.PUT("/perfil/modo", { body: { modo } })).catch(() => undefined);
}

/** Modo atual; atualiza quando qualquer tela troca o modo. */
export function useModoAtendimento(): ModoAtendimento | null {
  const [modo, setModo] = useState<ModoAtendimento | null>(lerModo);
  useEffect(() => {
    const aoMudar = (e: Event) => setModo((e as CustomEvent<ModoAtendimento | null>).detail);
    window.addEventListener(EVENTO, aoMudar);
    return () => window.removeEventListener(EVENTO, aoMudar);
  }, []);
  return modo;
}
