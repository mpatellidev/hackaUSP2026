// Tudo o que o módulo de chat precisa receber de quem o hospeda: o cliente da API (com a sessão) e a logo.
import type { Api } from "@uhealth/api-client";
import defaultLogo from "./assets/logo.svg";

export interface ChatConfig {
  api: Api;
  /** logo do app, usada como foto do assistente. MOCK: hoje é chat/assets/logo.svg */
  logoUrl: string;
}

let config: ChatConfig | null = null;

export function configureChat(patch: Pick<ChatConfig, "api"> & Partial<ChatConfig>) {
  config = { logoUrl: defaultLogo, ...patch };
}

export function chatConfig(): Readonly<ChatConfig> {
  if (!config) throw new Error("O chat não foi configurado: use <ChatApp api={...} />");
  return config;
}
