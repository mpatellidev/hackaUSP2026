/** Cliente HTTP mínimo. Erros do servidor ({"erro": {codigo, mensagem}}) viram ApiErro e NUNCA sucesso. */
export class ApiErro extends Error {
  constructor(public status: number, public codigo: string, mensagem: string) {
    super(mensagem);
  }
}

export const MODO: "mock" | "api" = import.meta.env.VITE_API_MODO === "api" ? "api" : "mock";
export const API_URL: string = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api/v1";

let token: string | null = null; // só em memória
let aoExpirar: () => void = () => {};
export const setToken = (t: string | null) => { token = t; };
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
