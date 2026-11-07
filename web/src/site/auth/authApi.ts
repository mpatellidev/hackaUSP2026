// Autenticação DEMO do backend UHealth (contrato §3): sem senha, conta fictícia, NÃO é segura.
// Papel e clínica vêm sempre do servidor (GET /auth/me); o site só guarda o token.

/** Raiz da API: VITE_API_URL (endereço do backend) + /api/v1. */
export const API_URL = `${((import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:8000").replace(/\/$/, "")}/api/v1`;

export interface User {
  id: string;
  papel: "paciente" | "funcionario";
  nome_exibicao: string;
}

/** Contas fictícias de paciente (docs/fixtures/contas-demo.json). O chat é só para pacientes. */
export const CONTAS_DEMO = [
  { conta: "paciente.ana", nome: "Ana M." },
  { conta: "paciente.bruno", nome: "Bruno S." },
  { conta: "paciente.carla", nome: "Carla P." },
  { conta: "paciente.diego", nome: "Diego L." },
  { conta: "paciente.eva", nome: "Eva R." },
  { conta: "paciente.fabio", nome: "Fábio T." },
];

export class AuthError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const TOKEN_KEY = "uhealth_token";

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
    let message = "Não foi possível completar a ação. Tente de novo.";
    try {
      const body = await res.json();
      if (typeof body?.erro?.mensagem === "string") message = body.erro.mensagem;
    } catch {
      /* corpo não-JSON */
    }
    throw new AuthError(res.status, message);
  }
  return (res.status === 204 ? undefined : res.json()) as Promise<T>;
}

export const authApi = {
  login: (conta: string) =>
    request<{ modo: "demo"; token: string; usuario: User }>("/auth/demo/login", {
      method: "POST",
      body: JSON.stringify({ conta }),
    }),
  me: () => request<{ modo: "demo"; usuario: User }>("/auth/me").then((r) => r.usuario),
  logout: () => request<void>("/auth/logout", { method: "POST" }),
};
