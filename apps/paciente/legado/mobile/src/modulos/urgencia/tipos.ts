export type EstadoRelato = 'aguardando_avaliacao' | 'avaliada';

export interface AvaliacaoUrgencia {
  id: string;
  relato_id: string;
  avaliador_usuario_id: string;
  classificacao: 'urgencia_confirmada' | 'sem_urgencia';
  observacao_administrativa: string | null;
  avaliado_em: string;
}

export interface RelatoUrgencia {
  id: string;
  paciente_id: string;
  solicitacao_id: string | null;
  estado: EstadoRelato;
  criado_em: string;
  rotulo: string;
  avaliacao: AvaliacaoUrgencia | null;
  modo: 'demo';
  aviso: string;
}

/** Interface do módulo. Implementações: `criarClienteApi` (backend) e `clienteMock` (offline). */
export interface ClienteUrgencia {
  relatar(solicitacaoId?: string | null): Promise<RelatoUrgencia>;
  listar(): Promise<RelatoUrgencia[]>;
}
