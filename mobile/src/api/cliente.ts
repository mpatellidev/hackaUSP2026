// Cliente HTTP base. Cada módulo (auth, clinicas, solicitacoes, e os das outras frentes) usa `chamar`.
// Em modo api, se a rota ainda não existe no backend (consulta /openapi.json) ou a rede falha,
// a função `mock` é usada e a origem vira "mock_fallback", visível na tela.

import { API_URL, MODO_CONFIGURADO, PREFIXO_API } from './config';
import { ErroApi } from './erros';
import { registrarOrigem } from './origem';

let token: string | null = null;

export function definirToken(t: string | null) {
  token = t;
}

let rotasBackend: Promise<Set<string> | null> | null = null;

// Caminhos do OpenAPI, ex.: "/api/v1/solicitacoes/{solicitacao_id}". null = backend inacessível.
function carregarRotas(): Promise<Set<string> | null> {
  if (!rotasBackend) {
    rotasBackend = fetch(`${API_URL}/openapi.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((doc) => (doc ? new Set(Object.keys(doc.paths ?? {})) : null))
      .catch(() => null)
      .then((rotas) => {
        if (!rotas) rotasBackend = null; // tenta de novo na próxima chamada
        return rotas;
      });
  }
  return rotasBackend;
}

function rotaExiste(rotas: Set<string>, metodoCaminho: string) {
  const caminho = PREFIXO_API + metodoCaminho.split('?')[0];
  const partes = caminho.split('/');
  for (const rota of rotas) {
    const p = rota.split('/');
    if (p.length === partes.length && p.every((s, i) => s.startsWith('{') || s === partes[i])) return true;
  }
  return false;
}

export function reiniciarDescobertaDeRotas() {
  rotasBackend = null;
}

interface Opcoes<T> {
  metodo?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  corpo?: unknown;
  /** Implementação mock equivalente, usada em modo mock e como fallback. */
  mock: () => Promise<T> | T;
}

export async function chamar<T>(caminho: string, { metodo = 'GET', corpo, mock }: Opcoes<T>): Promise<T> {
  if (MODO_CONFIGURADO === 'mock' || !API_URL) {
    registrarOrigem('mock');
    return mock();
  }

  const rotas = await carregarRotas();
  if (!rotas || !rotaExiste(rotas, caminho)) {
    registrarOrigem('mock_fallback');
    return mock();
  }

  let resp: Response;
  try {
    resp = await fetch(`${API_URL}${PREFIXO_API}${caminho}`, {
      method: metodo,
      headers: {
        Accept: 'application/json',
        ...(corpo !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: corpo !== undefined ? JSON.stringify(corpo) : undefined,
    });
  } catch {
    reiniciarDescobertaDeRotas();
    registrarOrigem('mock_fallback');
    return mock();
  }

  registrarOrigem('api');
  if (resp.status === 204) return undefined as T;
  const json = await resp.json().catch(() => null);
  if (!resp.ok) {
    const e = json?.erro;
    throw new ErroApi(
      resp.status,
      e?.codigo ?? 'erro',
      e?.mensagem ?? 'Não foi possível concluir agora. Tente de novo.',
      e?.detalhes,
    );
  }
  return json as T;
}
