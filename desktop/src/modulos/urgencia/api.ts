export interface RelatoUrgencia {
  id: string;
  paciente_id: string;
  solicitacao_id: string | null;
  estado: 'aguardando_avaliacao' | 'avaliada';
  criado_em: string;
  rotulo: string;
  avaliacao: { classificacao: 'urgencia_confirmada' | 'sem_urgencia'; observacao_administrativa: string | null; avaliado_em: string; avaliador_usuario_id: string } | null;
}

export interface ClienteUrgenciaPainel {
  listar(): Promise<RelatoUrgencia[]>;
  avaliar(id: string, classificacao: 'urgencia_confirmada' | 'sem_urgencia', observacao?: string): Promise<RelatoUrgencia>;
}

export function criarClienteApi(baseUrl: string, token: () => string | null, fetchImpl: typeof fetch = fetch): ClienteUrgenciaPainel {
  async function chamar<T>(caminho: string, init: RequestInit = {}): Promise<T> {
    const r = await fetchImpl(`${baseUrl}/api/v1${caminho}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token() ?? ''}` },
    });
    const corpo = await r.json().catch(() => null);
    if (!r.ok) throw new Error(corpo?.erro?.mensagem ?? 'Não foi possível concluir.');
    return corpo as T;
  }
  return {
    listar: async () => (await chamar<{ itens: RelatoUrgencia[] }>('/urgencias')).itens,
    avaliar: (id, classificacao, observacao) =>
      chamar<RelatoUrgencia>(`/urgencias/${id}/avaliacao`, {
        method: 'POST',
        body: JSON.stringify({ classificacao, observacao_administrativa: observacao || null }),
      }),
  };
}
