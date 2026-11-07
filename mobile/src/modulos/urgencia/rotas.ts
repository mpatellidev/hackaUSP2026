import type { RotaModulo } from '../../navegacao/tipos';
import { TelaUrgenciaRota } from './TelaUrgenciaRota';

// A #5 registra estas rotas na navegação (src/navegacao/modulos.ts).
export const rotas: RotaModulo[] = [{ nome: 'Urgencia.Relato', componente: TelaUrgenciaRota, titulo: 'Relatar urgência' }];
