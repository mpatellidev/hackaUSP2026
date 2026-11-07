/** Cliente HTTP mínimo. Erros do servidor ({"erro": {codigo, mensagem}}) viram ApiErro e NUNCA sucesso. */
export class ApiErro extends Error {
  constructor(public status: number, public codigo: string, mensagem: string) {
    super(mensagem);
  }
}

export const MODO: "mock" | "api" = import.meta.env.VITE_API_MODO === "api" ? "api" : "mock";
/** Base COM /api/v1 (ex.: http://localhost:8000/api/v1). Em outro aparelho, troque localhost pelo IP do computador. */
export const API_URL: string = (import.meta.env.VITE_API_URL ?? "http://localhost:8000/api/v1").replace(/\/+$/, "");

// Token DEMO em sessionStorage: sobrevive a recarregar a página, mas some ao fechar a aba (nunca localStorage).
const CHAVE_TOKEN = "uhealth.token";
const lerToken = (): string | null => { try { return sessionStorage.getItem(CHAVE_TOKEN); } catch { return null; } };
let token: string | null = lerToken();
let aoExpirar: () => void = () => {};
export const temToken = () => token !== null;
export const setToken = (t: string | null) => {
  token = t;
  try { if (t) sessionStorage.setItem(CHAVE_TOKEN, t); else sessionStorage.removeItem(CHAVE_TOKEN); } catch { /* sem armazenamento: só em memória */ }
};
export const aoNaoAutenticado = (fn: () => void) => { aoExpirar = fn; };

export async function http<T>(metodo: string, caminho: string, corpo?: unknown): Promise<T> {
  let resp: Response;
  try {
    resp = await fetch(`${API_URL}${caminho}`, {
      method: metodo,
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
    });
  } catch {
    throw new ApiErro(0, "sem_conexao", "Não foi possível falar com o servidor. Confira a conexão e tente de novo.");
  }
  if (resp.status === 204) return undefined as T;
  const json = await resp.json().catch(() => null);
  if (!resp.ok) {
    if (resp.status === 401) aoExpirar();
    const e = json?.erro;
    throw new ApiErro(resp.status, e?.codigo ?? "erro", e?.mensagem ?? "Algo deu errado. Tente de novo.");
  }
  return json as T;
}
