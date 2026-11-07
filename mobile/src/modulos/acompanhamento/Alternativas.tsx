import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { View } from 'react-native';

import { Aviso, Botao, Cartao, Carregando, ErroComRetry, Tela, Texto, Vazio, useCarregar } from '../../componentes';
import type { RotasRaiz } from '../../navegacao/tipos';
import { apiAcompanhamento } from './api';

export function Alternativas({ route, navigation }: NativeStackScreenProps<RotasRaiz, 'Acompanhamento.Alternativas'>) {
  const { solicitacaoId } = route.params as { solicitacaoId: string };
  const { dados, erro, carregando, atualizando, atualizar, recarregar } = useCarregar(() => apiAcompanhamento.alternativas(solicitacaoId), [solicitacaoId]);
  if (carregando) return <Carregando texto="Buscando alternativas…" />;
  if (erro || !dados) return <ErroComRetry mensagem={erro ?? 'Não foi possível buscar alternativas.'} aoTentar={recarregar} />;
  return <Tela aoAtualizar={atualizar} atualizando={atualizando}>
    <Aviso tom="aviso" titulo="Você decide">
      Nenhum pedido será enviado sem a sua escolha. Alternativa não garante vaga ou atendimento.
    </Aviso>
    {dados.itens.length === 0 ? <Vazio texto="Não há alternativas compatíveis agora. Seu pedido anterior continua no histórico." /> : dados.itens.map(({ clinica }) => (
      <Cartao key={clinica.id} destaque>
        <Texto variante="tituloCartao">{clinica.nome}</Texto>
        <Texto>{clinica.cidade} · custo: {clinica.custo_informado.replace('_', ' ')}</Texto>
        <Texto variante="apoio">Contato fictício: {clinica.telefone}</Texto>
        <Botao rotulo="Escolher esta clínica" icone="arrow-forward" onPress={async () => {
          try { const r = await apiAcompanhamento.encaminhar(solicitacaoId, clinica.id); navigation.replace('StatusPedido', { solicitacaoId: r.solicitacao.id }); }
          catch { recarregar(); }
        }} />
      </Cartao>
    ))}
    <View><Texto variante="apoio">Critérios: {dados.criterios.join(' · ')}</Texto></View>
  </Tela>;
}
