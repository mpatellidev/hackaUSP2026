import { TelaUrgencia } from './TelaUrgencia';
import { criarClienteApi } from './api';

const cliente = criarClienteApi();

/** Ponto de entrada na navegação (#5): monta o cliente e lê `solicitacaoId` dos params, se houver. */
export function TelaUrgenciaRota({ route }: { route?: { params?: { solicitacaoId?: string } } }) {
  return <TelaUrgencia cliente={cliente} solicitacaoId={route?.params?.solicitacaoId ?? null} />;
}
