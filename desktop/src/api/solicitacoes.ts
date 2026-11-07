import { http, MODO } from "./cliente";
import { criarMockSolicitacoes } from "./mock/solicitacoes";
import { sessaoAtual } from "./sessaoAtual";
import type { Estado, EventoSolicitacao, Solicitacao } from "./tipos";

export interface SolicitacoesApi {
  listar(estado?: Estado): Promise<Solicitacao[]>;
  obter(id: string): Promise<Solicitacao>;
  eventos(id: string): Promise<EventoSolicitacao[]>;
  transicionar(id: string, estado_novo: Estado, motivo?: string): Promise<Solicitacao>;
  reiniciar?(): void; // só no mock
}

/** Implementação real. Rotas de leitura: contrato §4.3/§4.4.
 *  ATENÇÃO: a rota de mudança de estado ainda NÃO está no contrato; é a que a issue #3 deve publicar.
 *  Se a #3 escolher outra, ajuste SÓ a função `transicionar` abaixo. */
export const solicitacoesHttp: SolicitacoesApi = {
  async listar(estado) {
    const q = estado ? `?estado=${estado}` : "";
    return (await http<{ itens: Solicitacao[] }>("GET", `/solicitacoes${q}`)).itens;
  },
  obter: (id) => http<Solicitacao>("GET", `/solicitacoes/${id}`),
  async eventos(id) {
    return (await http<{ itens: EventoSolicitacao[] }>("GET", `/solicitacoes/${id}/eventos`)).itens;
  },
  transicionar: (id, estado_novo, motivo) =>
    http<Solicitacao>("POST", `/solicitacoes/${id}/transicoes`, { estado_novo, motivo }),
};

export const solicitacoesApi: SolicitacoesApi =
  MODO === "api" ? solicitacoesHttp : criarMockSolicitacoes(sessaoAtual);
