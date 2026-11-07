import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { View } from 'react-native';

import { apiClinicas } from '../api';
import { Aviso, Carregando, ErroComRetry, Opcao, Tela, Texto, useCarregar, Vazio } from '../componentes';
import type { RotasRaiz } from '../navegacao/tipos';
import { useSessao } from '../sessao/SessaoContext';
import { ESPACO } from '../tema/tokens';

export function EscolhaCidade({ navigation }: NativeStackScreenProps<RotasRaiz, 'EscolhaCidade'>) {
  const { cidade, escolherCidade } = useSessao();
  const { dados, erro, carregando, atualizando, atualizar, recarregar } = useCarregar(async () => {
    const r = await apiClinicas.listar();
    const mapa = new Map<string, { cidade: string; uf: string; total: number }>();
    for (const c of r.itens) {
      const atual = mapa.get(c.cidade) ?? { cidade: c.cidade, uf: c.uf, total: 0 };
      atual.total += 1;
      mapa.set(c.cidade, atual);
    }
    return [...mapa.values()].sort((a, b) => a.cidade.localeCompare(b.cidade, 'pt-BR'));
  });

  return (
    <Tela aoAtualizar={atualizar} atualizando={atualizando}>
      <Texto variante="titulo">Onde você quer ser atendido?</Texto>
      <Aviso>O app não usa a sua localização. Escolha a cidade na lista.</Aviso>
      {carregando ? (
        <Carregando texto="Buscando cidades…" />
      ) : erro ? (
        <ErroComRetry mensagem={erro} aoTentar={recarregar} />
      ) : !dados?.length ? (
        <Vazio texto="Nenhuma cidade com clínicas cadastradas ainda." />
      ) : (
        <View style={{ gap: ESPACO[3] }} accessibilityRole="radiogroup">
          {dados.map((c) => (
            <Opcao
              key={c.cidade}
              rotulo={`${c.cidade}, ${c.uf}`}
              descricao={c.total === 1 ? '1 clínica-escola' : `${c.total} clínicas-escola`}
              selecionada={cidade === c.cidade}
              onPress={() => {
                escolherCidade(c.cidade);
                navigation.goBack();
              }}
            />
          ))}
        </View>
      )}
    </Tela>
  );
}
