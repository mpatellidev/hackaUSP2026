import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { View } from 'react-native';

import { mensagemDeErro } from '../../api';
import { Aviso, Botao, Cartao, Carregando, ErroComRetry, Tela, Texto, Vazio, useCarregar } from '../../componentes';
import type { RotasRaiz } from '../../navegacao/tipos';
import { formatarDataHora, rotuloEspecialidade } from '../../textos/rotulos';
import { apiAcompanhamento, type VagaDemo } from './api';

// "agendada" só aparece na tela do pedido, quando o backend confirma. Aqui o interesse nunca é agendamento.
function situacao(vaga: VagaDemo) {
  switch (vaga.interesse) {
    case 'registrado':
      return 'Você demonstrou interesse. Aguardando a clínica confirmar (ainda não é agendamento).';
    case 'confirmado':
      return 'A clínica confirmou esta vaga para você. Veja o andamento do pedido.';
    case 'nao_selecionado':
      return 'A clínica escolheu outra pessoa para esta vaga. Seu pedido segue em análise.';
    default:
      return vaga.estado === 'aberta' ? 'Vaga informada pela clínica.' : 'Vaga ocupada ou indisponível.';
  }
}

export function Vagas({ route }: NativeStackScreenProps<RotasRaiz, 'Acompanhamento.Vagas'>) {
  const { clinicaId, solicitacaoId } = route.params as { clinicaId: string; solicitacaoId: string };
  const { dados, erro, carregando, atualizando, atualizar, recarregar } = useCarregar(() => apiAcompanhamento.vagas(clinicaId), [clinicaId]);
  const [falha, setFalha] = useState<string | null>(null);
  const [enviando, setEnviando] = useState<string | null>(null);

  async function demonstrarInteresse(vagaId: string) {
    setFalha(null);
    setEnviando(vagaId);
    try {
      await apiAcompanhamento.interesse(vagaId, solicitacaoId);
    } catch (e) {
      setFalha(mensagemDeErro(e));
    } finally {
      setEnviando(null);
      atualizar();
    }
  }

  if (carregando) return <Carregando texto="Consultando vagas…" />;
  if (erro || !dados) return <ErroComRetry mensagem={erro ?? 'Não foi possível consultar vagas.'} aoTentar={recarregar} />;
  return <Tela aoAtualizar={atualizar} atualizando={atualizando}>
    <Aviso tom="aviso" titulo="Vaga não é agendamento">Demonstrar interesse não reserva a vaga. A clínica confirma uma única pessoa.</Aviso>
    {falha && <Aviso tom="perigo">{falha}</Aviso>}
    {dados.itens.length === 0 ? <Vazio texto="Não há vagas informadas no momento." /> : dados.itens.map((vaga) => (
      <Cartao key={vaga.id} destaque>
        <Texto variante="tituloCartao">{rotuloEspecialidade(vaga.especialidade)}</Texto>
        <Texto>{formatarDataHora(vaga.inicio)}</Texto>
        <Texto variante="apoio">{situacao(vaga)}</Texto>
        {!vaga.interesse && (
          <Botao rotulo="Demonstrar interesse" icone="event-available" desabilitado={vaga.estado !== 'aberta'}
            carregando={enviando === vaga.id} onPress={() => demonstrarInteresse(vaga.id)} />
        )}
      </Cartao>
    ))}
    <View><Texto variante="apoio">No modo mock, a simulação é identificada pelo aviso de dados do aplicativo.</Texto></View>
  </Tela>;
}
