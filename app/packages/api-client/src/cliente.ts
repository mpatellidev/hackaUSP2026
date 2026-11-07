import createClient from "openapi-fetch";
import { ErroApi, erroDaResposta } from "./erro";
import type { paths } from "./schema";

export interface OpcoesApi {
  /** Raiz da API. Padrão `/api/v1` (mesma origem: proxy do Vite em dev, FastAPI em produção). */
  baseUrl?: string;
  obterToken: () => string | null;
  /** Chamado quando a API devolve 401 (token vencido ou sessão encerrada). */
  aoNaoAutenticado?: () => void;
}

type Resultado<T> = { data?: T; error?: unknown; response: Response };

export function criarApi({ baseUrl = "/api/v1", obterToken, aoNaoAutenticado }: OpcoesApi) {
  const cliente = createClient<paths>({ baseUrl });
  cliente.use({
    onRequest({ request }) {
      const token = obterToken();
      if (token) request.headers.set("Authorization", `Bearer ${token}`);
      return request;
    },
  });

  /** Desembrulha a resposta tipada; qualquer falha vira `ErroApi` (inclusive sem conexão). */
  async function dados<T>(chamada: Promise<Resultado<T>>): Promise<NonNullable<T>> {
    let r: Resultado<T>;
    try {
      r = await chamada;
    } catch {
      throw new ErroApi(0, "sem_conexao", "Não foi possível conectar ao servidor. Confira sua internet e tente de novo.");
    }
    if (!r.response.ok) {
      if (r.response.status === 401) aoNaoAutenticado?.();
      throw await erroDaResposta(r.response, r.error);
    }
    return r.data as NonNullable<T>;
  }

  /** Para respostas sem corpo (ex.: 204 do logout). */
  async function semCorpo(chamada: Promise<Resultado<unknown>>): Promise<void> {
    await dados(chamada as Promise<Resultado<unknown>>).catch((e: unknown) => {
      if (e instanceof ErroApi || !(e instanceof TypeError)) throw e;
    });
  }

  return { cliente, dados, semCorpo };
}

export type Api = ReturnType<typeof criarApi>;
