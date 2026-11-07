import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useRef } from 'react';

import { apiClinicas, apiSolicitacoes } from '../api';
import { Aviso, Botao, Cartao, Carregando, Chip, ErroComRetry, Tela, Texto, useCarregar, Vazio } from '../componentes';
import type { RotasRaiz } from '../navegacao/tipos';
import { AVISOS } from '../textos/avisos';
import { formatarDataHora, ROTULO_ESTADO, rotuloEspecialidade } from '../textos/rotulos';
import { TOM_ESTADO } from './estadoVisual';

export function MeusPedidos() {
  const navigation = useNavigation<NativeStackNavigationProp<RotasRaiz>>();
  const { dados, erro, carregando, atualizando, atualizar, recarregar } = useCarregar(async () => {
    const [pedidos, clinicas] = await Promise.all([apiSolicitacoes.minhas(), apiClinicas.listar()]);
    const nomes = new Map(clinicas.itens.map((c) => [c.id, c.nome]));
    return pedidos.itens.map((p) => ({ ...p, clinica_nome: nomes.get(p.clinica_id) ?? 'Clínica' }));
  });

  // Recarrega ao voltar para a aba (o app não recebe notificações).
  const primeira = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (primeira.current) {
        primeira.current = false;
        return;
      }
      atualizar();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  return (
    <Tela aoAtualizar={atualizar} atualizando={atualizando}>
      <Texto variante="titulo">Meus pedidos</Texto>
      <Aviso>{AVISOS.semPush}</Aviso>
      {carregando ? (
        <Carregando texto="Buscando seus pedidos…" />
      ) : erro ? (
        <ErroComRetry mensagem={erro} aoTentar={recarregar} />
      ) : !dados?.length ? (
        <Vazio texto="Você ainda não fez nenhum pedido. Escolha uma clínica na aba Clínicas." />
      ) : (
        dados.map((p) => (
          <Cartao
            key={p.id}
            onPress={() => navigation.navigate('StatusPedido', { solicitacaoId: p.id })}
            rotuloAcessivel={`Pedido para ${p.clinica_nome}, ${rotuloEspecialidade(p.especialidade)}. Situação: ${
              ROTULO_ESTADO[p.estado]
            }. Tocar para ver o andamento.`}
          >
            <Texto variante="tituloCartao">{p.clinica_nome}</Texto>
            <Chip rotulo={ROTULO_ESTADO[p.estado] ?? p.estado} tom={TOM_ESTADO[p.estado] ?? 'normal'} />
            <Texto variante="apoio">
              {rotuloEspecialidade(p.especialidade)} · enviado em {formatarDataHora(p.criado_em)}
            </Texto>
          </Cartao>
        ))
      )}
      <Botao rotulo="Atualizar" icone="refresh" variante="contorno" onPress={atualizar} carregando={atualizando} />
    </Tela>
  );
}
