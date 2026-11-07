// Cliente do módulo. A #5 fornece baseUrl (EXPO_PUBLIC_API_URL) e o token da sessão demo.
import type { ClienteUrgencia, RelatoUrgencia } from './tipos';

export interface OpcoesApi {
  baseUrl: string;
  token: () => string | null;
  fetchImpl?: typeof fetch;
}

export function criarClienteApi({ baseUrl, token, fetchImpl = fetch }: OpcoesApi): ClienteUrgencia {
  async function chamar<T>(caminho: string, init: RequestInit = {}): Promise<T> {
    const resp = await fetchImpl(`${baseUrl}/api/v1${caminho}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token() ?? ''}`,
      },
    });
    const corpo = await resp.json().catch(() => null);
    if (!resp.ok) throw new Error(corpo?.erro?.mensagem ?? 'Não foi possível concluir agora.');
    return corpo as T;
  }
  return {
    relatar: (solicitacaoId = null) =>
      chamar<RelatoUrgencia>('/urgencias', { method: 'POST', body: JSON.stringify({ solicitacao_id: solicitacaoId }) }),
    listar: async () => (await chamar<{ itens: RelatoUrgencia[] }>('/urgencias')).itens,
  };
}
