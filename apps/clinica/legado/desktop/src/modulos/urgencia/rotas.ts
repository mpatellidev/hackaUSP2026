import type { RotaModulo } from '../../rotas';
import PainelUrgenciaRota from './PainelUrgenciaRota';

// A #7 monta o menu com esta entrada.
export const rotas: RotaModulo[] = [{ caminho: '/urgencia', rotulo: 'Urgências', componente: PainelUrgenciaRota }];
