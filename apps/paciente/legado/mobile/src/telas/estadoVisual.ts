import type { EstadoSolicitacao } from '../api';

type Tom = 'normal' | 'aviso' | 'perigo';

export const TOM_ESTADO: Record<EstadoSolicitacao, Tom> = {
  enviada: 'normal',
  em_analise: 'normal',
  precisa_contato: 'aviso',
  indisponivel: 'perigo',
  aguardando_confirmacao: 'aviso',
  agendada: 'normal',
  concluida: 'normal',
};
