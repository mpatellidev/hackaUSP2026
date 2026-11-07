// Endpoints do backend usados pelo chat, pelo cliente tipado compartilhado (@uhealth/api-client).
// Os tipos vêm do OpenAPI do backend (modulos/acessibilidade/schemas.py).
import type { components } from "@uhealth/api-client";
import { chatConfig } from "../config";

type S = components["schemas"];

export type ProfileIn = S["PerfilChatIn"];
export type Profile = S["PerfilChatOut"];
export type ChatResponse = S["ChatOut"];
export type UiPrefs = S["UiPrefs"];
export type AudioPayload = S["AudioPayload"];
export type BotMessage = S["BotMessage"];
export type QuickReply = S["QuickReply"];
export type Escolaridade = ProfileIn["escolaridade"];
export type FaixaEtaria = ProfileIn["faixa_etaria"];
export type Deficiencia = NonNullable<ProfileIn["deficiencias"]>[number];

/** Quem está conversando (nome vem da sessão). */
export interface ChatUser {
  nome: string;
  /** MOCK: o backend ainda não envia foto; enquanto vier vazio, mostramos as iniciais. */
  foto_url?: string | null;
}

export const api = {
  getProfile: () => {
    const { api: a } = chatConfig();
    return a.dados(a.cliente.GET("/acessibilidade/chat/perfil", {}));
  },
  saveProfile: (p: ProfileIn) => {
    const { api: a } = chatConfig();
    return a.dados(a.cliente.PUT("/acessibilidade/chat/perfil", { body: p }));
  },
  chat: (message: string, conversation_id: string | null) => {
    const { api: a } = chatConfig();
    return a.dados(a.cliente.POST("/acessibilidade/chat", { body: { message, conversation_id } }));
  },
};

/** O backend devolve o caminho a partir da raiz do servidor (ex.: /api/v1/acessibilidade/audio/x.mp3). */
export function audioUrl(url: string): string {
  return new URL(url, window.location.origin).href;
}
