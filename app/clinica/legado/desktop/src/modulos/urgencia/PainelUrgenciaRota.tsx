import { useSessao } from '../../sessao';
import { clienteUrgencia } from './api';
import { PainelUrgencia } from './PainelUrgencia';

/** Entrada da rota: injeta o cliente e a função do funcionário (vinda do servidor, via /auth/me). */
export default function PainelUrgenciaRota() {
  const { usuario } = useSessao();
  const funcao = (usuario?.funcao ?? 'atendimento') as 'atendimento' | 'profissional' | 'coordenacao';
  return <PainelUrgencia cliente={clienteUrgencia} funcao={funcao} />;
}
