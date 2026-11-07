import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { View } from 'react-native';

import { Aviso, Botao, Cartao, Carregando, ErroComRetry, Tela, Texto, Vazio, useCarregar } from '../../componentes';
import type { RotasRaiz } from '../../navegacao/tipos';
import { formatarDataHora } from '../../textos/rotulos';
import { apiAcompanhamento } from './api';

export function Vagas({ route }: NativeStackScreenProps<RotasRaiz, 'Acompanhamento.Vagas'>) {
  const { clinicaId, solicitacaoId } = route.params as { clinicaId: string; solicitacaoId: string };
  const { dados, erro, carregando, atualizando, atualizar, recarregar } = useCarregar(() => apiAcompanhamento.vagas(clinicaId), [clinicaId]);
  if (carregando) return <Carregando texto="Consultando vagas…" />;
  if (erro || !dados) return <ErroComRetry mensagem={erro ?? 'Não foi possível consultar vagas.'} aoTentar={recarregar} />;
  return <Tela aoAtualizar={atualizar} atualizando={atualizando}>
    <Aviso tom="aviso" titulo="Vaga não é agendamento">Demonstrar interesse não reserva a vaga. A clínica confirma uma única pessoa.</Aviso>
    {dados.itens.length === 0 ? <Vazio texto="Não há vagas informadas no momento." /> : dados.itens.map((vaga) => (
      <Cartao key={vaga.id} destaque>
        <Texto variante="tituloCartao">{vaga.especialidade.replace('_', ' ')}</Texto>
        <Texto>{formatarDataHora(vaga.inicio)}</Texto>
        <Texto variante="apoio">{vaga.interesse === 'registrado' ? 'Aguardando confirmação da clínica.' : vaga.estado === 'aberta' ? 'Vaga informada pela clínica.' : 'Vaga ocupada ou indisponível.'}</Texto>
        <Botao rotulo={vaga.interesse ? 'Interesse registrado' : 'Demonstrar interesse'} icone="event-available" desabilitado={!!vaga.interesse || vaga.estado !== 'aberta'} onPress={async () => { await apiAcompanhamento.interesse(vaga.id, solicitacaoId); atualizar(); }} />
      </Cartao>
    ))}
    <View><Texto variante="apoio">No modo mock, a simulação é identificada pelo aviso de dados do aplicativo.</Texto></View>
  </Tela>;
}
