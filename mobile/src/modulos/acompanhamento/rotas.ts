import type { RotaModulo } from '../../navegacao/tipos';
import { Alternativas } from './Alternativas';
import { Vagas } from './Vagas';

// Estas telas exigem params (solicitacaoId, clinicaId): abrem pelo andamento do pedido, sem atalho em Ajustes.
export const rotas: RotaModulo[] = [
  { nome: 'Acompanhamento.Alternativas', componente: Alternativas, titulo: 'Clínicas sugeridas', semAtalho: true },
  { nome: 'Acompanhamento.Vagas', componente: Vagas, titulo: 'Vagas informadas', semAtalho: true },
];
