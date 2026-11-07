import { http, MODO } from '../../api/cliente';
import { sessaoAtual } from '../../api/sessaoAtual';

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

/** Cliente real: usa o `http` do desktop (URL base já inclui /api/v1, token da sessão). */
export function criarClienteApi(): ClienteUrgenciaPainel {
  return {
    listar: async () => (await http<{ itens: RelatoUrgencia[] }>('GET', '/urgencias')).itens,
    avaliar: (id, classificacao, observacao) =>
      http<RelatoUrgencia>('POST', `/urgencias/${id}/avaliacao`, { classificacao, observacao_administrativa: observacao || null }),
  };
}

/** Cliente demonstrativo (modo mock): dados fictícios em memória. */
export function criarClienteMock(): ClienteUrgenciaPainel {
  let itens: RelatoUrgencia[] = [{
    id: 'mock-relato-1', paciente_id: 'mock-paciente', solicitacao_id: null, estado: 'aguardando_avaliacao',
    criado_em: new Date().toISOString(), rotulo: 'Aguardando avaliação', avaliacao: null,
  }];
  return {
    listar: async () => itens,
    avaliar: async (id, classificacao, observacao) => {
      const r = itens.find((x) => x.id === id);
      if (!r) throw new Error('Relato não encontrado.');
      const novo: RelatoUrgencia = {
        ...r, estado: 'avaliada', rotulo: 'Avaliada por profissional',
        avaliacao: { classificacao, observacao_administrativa: observacao || null, avaliado_em: new Date().toISOString(), avaliador_usuario_id: sessaoAtual()?.id ?? 'mock' },
      };
      itens = itens.map((x) => (x.id === id ? novo : x));
      return novo;
    },
  };
}

export const clienteUrgencia: ClienteUrgenciaPainel = MODO === 'api' ? criarClienteApi() : criarClienteMock();
