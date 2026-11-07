// Cliente do módulo. Usa o `chamar` do adaptador da #5: token da sessão demo, erro no formato do contrato
// e, em modo mock ou se a rota/rede falhar, o cliente mock (com o aviso de origem visível na tela).
import { chamar } from '../../api/cliente';
import type { Lista } from '../../api/tipos';
import { criarClienteMock } from './mock/clienteMock';
import type { ClienteUrgencia, RelatoUrgencia } from './tipos';

export function criarClienteApi(): ClienteUrgencia {
  const mock = criarClienteMock();
  return {
    relatar: (solicitacaoId = null) =>
      chamar<RelatoUrgencia>('/urgencias', {
        metodo: 'POST',
        corpo: { solicitacao_id: solicitacaoId },
        mock: () => mock.relatar(solicitacaoId),
      }),
    listar: async () =>
      (
        await chamar<Lista<RelatoUrgencia>>('/urgencias', {
          mock: async () => {
            const itens = await mock.listar();
            return { itens, total: itens.length };
          },
        })
      ).itens,
  };
}
