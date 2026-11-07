import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { TextInput, View } from 'react-native';

import { apiClinicas, apiSolicitacoes, ErroApi, mensagemDeErro } from '../api';
import {
  Aviso,
  Botao,
  Cartao,
  Carregando,
  ErroComRetry,
  Opcao,
  Tela,
  Texto,
  useCarregar,
} from '../componentes';
import type { RotasRaiz } from '../navegacao/tipos';
import { useSessao } from '../sessao/SessaoContext';
import { useTema } from '../tema/TemaContext';
import { ESPACO, FONTES, TAMANHO } from '../tema/tokens';
import { AVISOS } from '../textos/avisos';
import { ROTULO_PUBLICO, rotuloEspecialidade } from '../textos/rotulos';
import type { Publico } from '../api/tipos';

const LIMITE = 280;

export function ConfirmarPedido({ route, navigation }: NativeStackScreenProps<RotasRaiz, 'ConfirmarPedido'>) {
  const { clinicaId } = route.params;
  const { usuario } = useSessao();
  const { cores, fs, nome } = useTema();
  const { dados: clinica, erro, carregando, recarregar } = useCarregar(() => apiClinicas.obter(clinicaId), [clinicaId]);

  const [especialidade, setEspecialidade] = useState<string | null>(null);
  const [publico, setPublico] = useState<Publico | null>(null);
  const [descricao, setDescricao] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [falha, setFalha] = useState<{ mensagem: string; pedidoExistente?: string } | null>(null);

  useEffect(() => {
    if (clinica?.especialidades.length === 1) setEspecialidade(clinica.especialidades[0]);
    if (clinica?.publico.length === 1) setPublico(clinica.publico[0]);
  }, [clinica]);

  if (carregando) return <Carregando />;
  if (erro || !clinica) return <ErroComRetry mensagem={erro ?? 'Clínica não encontrada.'} aoTentar={recarregar} />;

  const texto = descricao.trim();
  const podeEnviar = !!especialidade && !!publico && texto.length > 0 && texto.length <= LIMITE && !enviando;

  async function enviar() {
    if (!especialidade || !publico) return;
    setEnviando(true);
    setFalha(null);
    try {
      const s = await apiSolicitacoes.criar({
        clinica_id: clinicaId,
        especialidade,
        publico_alvo: publico,
        descricao_administrativa: texto,
      });
      navigation.replace('PedidoEnviado', { solicitacaoId: s.id });
    } catch (e) {
      const existente =
        e instanceof ErroApi && e.codigo === 'solicitacao_duplicada'
          ? (e.detalhes?.solicitacao_id as string | undefined)
          : undefined;
      setFalha({ mensagem: mensagemDeErro(e), pedidoExistente: existente });
      setEnviando(false);
    }
  }

  return (
    <Tela>
      <Texto variante="titulo">Pedir atendimento</Texto>
      <Aviso tom="aviso" titulo="Pedido não é agendamento">
        {AVISOS.pedidoNaoEAgendamento}
      </Aviso>

      <View style={{ gap: ESPACO[2] }}>
        <Texto variante="tituloCartao">1. Qual área?</Texto>
        <View style={{ gap: ESPACO[2] }} accessibilityRole="radiogroup">
          {clinica.especialidades.map((e) => (
            <Opcao
              key={e}
              rotulo={rotuloEspecialidade(e)}
              selecionada={especialidade === e}
              onPress={() => setEspecialidade(e)}
            />
          ))}
        </View>
      </View>

      <View style={{ gap: ESPACO[2] }}>
        <Texto variante="tituloCartao">2. Para quem é o atendimento?</Texto>
        <Texto variante="apoio">Assim a clínica confirma se atende esse público. Não é uma avaliação de saúde.</Texto>
        <View style={{ gap: ESPACO[2] }} accessibilityRole="radiogroup">
          {clinica.publico.map((p) => (
            <Opcao key={p} rotulo={ROTULO_PUBLICO[p] ?? p} selecionada={publico === p} onPress={() => setPublico(p)} />
          ))}
        </View>
      </View>

      <View style={{ gap: ESPACO[2] }}>
        <Texto variante="tituloCartao" nativeID="rotuloDescricao">
          3. Motivo do pedido
        </Texto>
        <Texto variante="apoio">{AVISOS.descricao}</Texto>
        <TextInput
          accessibilityLabelledBy="rotuloDescricao"
          accessibilityLabel="Motivo do pedido"
          value={descricao}
          onChangeText={setDescricao}
          maxLength={LIMITE}
          multiline
          placeholder="Ex.: consulta de rotina"
          placeholderTextColor={cores.apagado}
          style={{
            minHeight: fs(96),
            borderWidth: 2,
            borderColor: cores.bordaForte,
            borderRadius: nome === 'alto_contraste' ? 8 : 14,
            padding: ESPACO[3],
            color: cores.texto,
            backgroundColor: cores.superficie,
            fontFamily: FONTES.corpo,
            fontSize: fs(TAMANHO.corpo),
            textAlignVertical: 'top',
          }}
        />
        <Texto variante="apoio" style={{ textAlign: 'right' }}>
          {descricao.length}/{LIMITE}
        </Texto>
      </View>

      <Cartao>
        <Texto variante="tituloCartao">4. Confira</Texto>
        <Linha rotulo="Clínica" valor={clinica.nome} />
        <Linha rotulo="Área" valor={especialidade ? rotuloEspecialidade(especialidade) : 'Escolha acima'} />
        <Linha rotulo="Público" valor={publico ? (ROTULO_PUBLICO[publico] ?? publico) : 'Escolha acima'} />
        <Linha rotulo="Motivo" valor={texto || 'Escreva acima'} />
        <Linha rotulo="Quem pede" valor={`${usuario?.nome_exibicao ?? ''} (conta fictícia)`} />
        <Texto variante="apoio">A clínica verá estas informações. {AVISOS.custo}</Texto>
      </Cartao>

      {falha && (
        <View style={{ gap: ESPACO[2] }}>
          <Aviso tom="perigo">{falha.mensagem}</Aviso>
          {falha.pedidoExistente && (
            <Botao
              rotulo="Ver pedido em andamento"
              variante="contorno"
              onPress={() => navigation.replace('StatusPedido', { solicitacaoId: falha.pedidoExistente! })}
            />
          )}
        </View>
      )}

      <Botao rotulo="Enviar pedido" icone="send" onPress={enviar} desabilitado={!podeEnviar} carregando={enviando} />
      {!podeEnviar && !enviando && (
        <Texto variante="apoio" style={{ textAlign: 'center' }}>
          Escolha a área, o público e escreva o motivo para enviar.
        </Texto>
      )}
    </Tela>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <View>
      <Texto variante="apoio">{rotulo}</Texto>
      <Texto variante="negrito">{valor}</Texto>
    </View>
  );
}
