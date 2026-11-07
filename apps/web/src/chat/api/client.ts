// Endpoints do backend usados pelo chat. Os tipos espelham app/schemas.py do backend.
// Endereço e token vêm de chat/config.ts (definidos por quem hospeda o chat).
import { chatConfig } from "../config";

export type Escolaridade =
  | "fundamental_incompleto"
  | "fundamental_completo"
  | "medio_completo"
  | "superior_completo"
  | "pos_graduacao"
  | "prefiro_nao_dizer";
export type FaixaEtaria = "ate_17" | "18_29" | "30_59" | "60_mais" | "prefiro_nao_dizer";
export type Deficiencia = "visual" | "auditiva" | "motora" | "intelectual" | "tea" | "nenhuma" | "prefiro_nao_dizer";

export interface ProfileIn {
  escolaridade: Escolaridade;
  faixa_etaria: FaixaEtaria;
  deficiencias: Deficiencia[];
  prefere_audio: boolean;
}

export interface UiPrefs {
  auto_play_audio: boolean;
  font_scale: number;
  high_contrast: boolean;
  show_quick_replies: boolean;
  vlibras: boolean;
}

export interface Profile extends ProfileIn {
  ui_prefs: UiPrefs;
  resumo: string;
}

export interface AudioPayload {
  text: string;
  url: string | null;
}
export interface BotMessage {
  text: string;
  audio: AudioPayload | null;
}
export interface QuickReply {
  label: string;
  value: string;
}
export interface ChatResponse {
  conversation_id: number;
  messages: BotMessage[];
  quick_replies: QuickReply[];
  ui_prefs: UiPrefs;
}
/** Quem está conversando. Vem do site/sistema que hospeda o chat. */
export interface ChatUser {
  nome: string;
  /** MOCK: o backend ainda não envia foto; enquanto vier vazio, mostramos as iniciais. */
  foto_url?: string | null;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { apiUrl, getToken, onUnauthorized } = chatConfig();
  const token = getToken();
  const res = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
  if (!res.ok) {
    let detail = "Não foi possível completar a ação. Tente de novo.";
    try {
      const body = await res.json();
      if (typeof body.detail === "string") detail = body.detail;
    } catch {
      /* corpo não-JSON */
    }
    if (res.status === 401) onUnauthorized?.();
    throw new ApiError(res.status, detail);
  }
  return res.json() as Promise<T>;
}

export const api = {
  getProfile: () => request<Profile>("/me/profile"),
  saveProfile: (p: ProfileIn) => request<Profile>("/me/profile", { method: "PUT", body: JSON.stringify(p) }),
  chat: (message: string, conversation_id: number | null) =>
    request<ChatResponse>("/chat", { method: "POST", body: JSON.stringify({ message, conversation_id }) }),
};

export function audioUrl(url: string): string {
  return url.startsWith("http") ? url : `${chatConfig().apiUrl}${url}`;
}
