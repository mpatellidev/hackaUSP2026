// Tudo o que o módulo de chat precisa receber de quem o hospeda.
// O chat não sabe como a pessoa fez login: só recebe o token e onde fica o backend.
import defaultLogo from "./assets/logo.svg";

export interface ChatConfig {
  /** endereço do backend (padrão: VITE_API_URL ou http://localhost:8000) */
  apiUrl: string;
  /** token de acesso da pessoa logada (enviado como Bearer) */
  getToken: () => string | null;
  /** chamado quando o backend responde 401 (token vencido/inválido) */
  onUnauthorized?: () => void;
  /** logo do app, usada como foto do assistente. MOCK: hoje é chat/assets/logo.svg */
  logoUrl: string;
}

const config: ChatConfig = {
  apiUrl: (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:8000",
  getToken: () => null,
  logoUrl: defaultLogo,
};

export function configureChat(patch: Partial<ChatConfig>) {
  for (const [k, v] of Object.entries(patch)) {
    if (v !== undefined) (config as unknown as Record<string, unknown>)[k] = v;
  }
}

export function chatConfig(): Readonly<ChatConfig> {
  return config;
}
