import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { View } from 'react-native';

import { apiClinicas, type Clinica } from '../api';
import {
  Aviso,
  Botao,
  Cartao,
  Carregando,
  Chip,
  ErroComRetry,
  LinhaChips,
  Tela,
  Texto,
  useCarregar,
  Vazio,
} from '../componentes';
import type { RotasRaiz } from '../navegacao/tipos';
import { useSessao } from '../sessao/SessaoContext';
import { useTema } from '../tema/TemaContext';
import { ESPACO } from '../tema/tokens';
import { AVISOS } from '../textos/avisos';
import { ROTULO_CUSTO, rotuloEspecialidade, rotuloPublico } from '../textos/rotulos';

export function ChipsClinica({ clinica }: { clinica: Clinica }) {
  return (
    <LinhaChips>
      {clinica.recebendo_pedidos ? (
        <Chip rotulo="Recebendo pedidos" icone="check" />
      ) : (
        <Chip rotulo="Fechada por ora" icone="remove" tom="perigo" />
      )}
      <Chip rotulo={ROTULO_CUSTO[clinica.custo_informado] ?? 'Custo a confirmar'} tom="aviso" />
    </LinhaChips>
  );
}

export function ListaClinicas() {
  const navigation = useNavigation<NativeStackNavigationProp<RotasRaiz>>();
  const { cidade } = useSessao();
  const { cores } = useTema();
  const { dados, erro, carregando, atualizando, atualizar, recarregar } = useCarregar(
    async () => {
      if (!cidade) return [];
      const r = await apiClinicas.listar({ cidade });
      // Primeiro as que estão recebendo pedidos; depois por nome.
      return [...r.itens].sort(
        (a, b) => Number(b.recebendo_pedidos) - Number(a.recebendo_pedidos) || a.nome.localeCompare(b.nome, 'pt-BR'),
      );
    },
    [cidade],
  );

  if (!cidade) {
    return (
      <Tela>
        <Texto variante="titulo">Vamos começar pela cidade</Texto>
        <Texto>Escolha a cidade onde você quer ser atendido para ver as clínicas-escola.</Texto>
        <Botao rotulo="Escolher cidade" icone="place" onPress={() => navigation.navigate('EscolhaCidade')} />
      </Tela>
    );
  }

  return (
    <Tela aoAtualizar={atualizar} atualizando={atualizando}>
      <Cartao onPress={() => navigation.navigate('EscolhaCidade')} rotuloAcessivel={`Cidade: ${cidade}. Tocar para trocar.`}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: ESPACO[2] }}>
          <View style={{ flex: 1 }}>
            <Texto variante="apoio">Sua cidade</Texto>
            <Texto variante="tituloCartao">{cidade}</Texto>
          </View>
          <Texto variante="negrito" cor={cores.link}>
            Trocar
          </Texto>
        </View>
      </Cartao>

      <Aviso>{AVISOS.custo}</Aviso>

      {carregando ? (
        <Carregando texto="Buscando clínicas…" />
      ) : erro ? (
        <ErroComRetry mensagem={erro} aoTentar={recarregar} />
      ) : !dados?.length ? (
        <Vazio texto={`Ainda não encontramos clínicas-escola em ${cidade}.`} />
      ) : (
        <>
          <Texto variante="apoio">
            {dados.length === 1 ? '1 clínica-escola' : `${dados.length} clínicas-escola`} em {cidade}
          </Texto>
          {dados.map((c) => (
            <Cartao
              key={c.id}
              destaque={c.recebendo_pedidos}
              onPress={() => navigation.navigate('DetalheClinica', { clinicaId: c.id })}
              rotuloAcessivel={`${c.nome}. ${c.recebendo_pedidos ? 'Recebendo pedidos' : 'Fechada por ora'}. ${
                ROTULO_CUSTO[c.custo_informado]
              }. Tocar para ver detalhes.`}
            >
              <Texto variante="tituloCartao">{c.nome}</Texto>
              <ChipsClinica clinica={c} />
              <Texto variante="apoio">
                {rotuloPublico(c.publico)} · {c.especialidades.map(rotuloEspecialidade).join(', ')}
              </Texto>
              <Texto variante="apoio">Telefone: {c.telefone}</Texto>
            </Cartao>
          ))}
        </>
      )}

      <Botao rotulo="Atualizar" icone="refresh" variante="contorno" onPress={atualizar} carregando={atualizando} />
    </Tela>
  );
}
