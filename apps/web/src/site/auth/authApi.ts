// Autenticação do SITE (provisória). No sistema real, o login vem de lá (ex.: SSO/redirect)
// e esta pasta é substituída; o chat só precisa receber o token.

export const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:8000";

export interface User {
  id: number;
  email: string;
  nome: string;
  /** MOCK: o backend ainda não envia foto. */
  foto_url?: string | null;
}

export class AuthError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const TOKEN_KEY = "chat_token";

export const tokenStore = {
  get: (): string | null => {
    try {
      return sessionStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set: (t: string | null) => {
    try {
      if (t) sessionStorage.setItem(TOKEN_KEY, t);
      else sessionStorage.removeItem(TOKEN_KEY);
    } catch {
      /* armazenamento indisponível: o token fica só em memória */
    }
  },
};

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = tokenStore.get();
  const res = await fetch(`${API_URL}${path}`, {
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
    throw new AuthError(res.status, detail);
  }
  return res.json() as Promise<T>;
}

export const authApi = {
  login: (email: string, senha: string) =>
    request<{ access_token: string }>("/auth/login", { method: "POST", body: JSON.stringify({ email, senha }) }),
  me: () => request<User>("/auth/me"),
};
