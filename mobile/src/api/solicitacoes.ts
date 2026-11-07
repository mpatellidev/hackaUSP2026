import { chamar } from './cliente';
import { mock } from './mock/servidor';
import type { EventoSolicitacao, Lista, NovaSolicitacao, Solicitacao } from './tipos';

export const apiSolicitacoes = {
  // paciente_id vem do token no servidor; o app nunca o envia.
  criar: (dados: NovaSolicitacao) =>
    chamar<Solicitacao>('/solicitacoes', { metodo: 'POST', corpo: dados, mock: () => mock.criarSolicitacao(dados) }),
  minhas: () => chamar<Lista<Solicitacao>>('/solicitacoes', { mock: () => mock.solicitacoes() }),
  obter: (id: string) => chamar<Solicitacao>(`/solicitacoes/${id}`, { mock: () => mock.solicitacao(id) }),
  eventos: (id: string) =>
    chamar<Lista<EventoSolicitacao>>(`/solicitacoes/${id}/eventos`, { mock: () => mock.eventos(id) }),
};
