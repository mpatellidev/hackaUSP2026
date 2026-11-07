import { MaterialIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { View } from 'react-native';

import { apiClinicas, apiSolicitacoes, type EstadoSolicitacao, type EventoSolicitacao } from '../api';
import {
  abrirDiscador,
  Aviso,
  Botao,
  Cartao,
  Carregando,
  ErroComRetry,
  Tela,
  Texto,
  useCarregar,
} from '../componentes';
import { ROTAS_MODULOS } from '../navegacao/modulos';
import type { RotasRaiz } from '../navegacao/tipos';
import { useTema } from '../tema/TemaContext';
import { ESPACO } from '../tema/tokens';
import { AVISOS } from '../textos/avisos';
import { formatarDataHora, ROTULO_ESTADO, rotuloEspecialidade } from '../textos/rotulos';

// Rota que a #6 (acompanhamento) pode registrar para alternativas/escolha de outra clínica.
const ROTA_ALTERNATIVAS = 'Acompanhamento.Alternativas';
// Vagas informadas pela clínica (#6/#4): só faz sentido com o pedido já em análise.
const ROTA_VAGAS = 'Acompanhamento.Vagas';
const ESTADOS_COM_VAGAS: EstadoSolicitacao[] = ['em_analise', 'precisa_contato', 'aguardando_confirmacao'];
// Relato de urgência (#14): leva a revisão humana, nunca pune.
const ROTA_URGENCIA = 'Urgencia.Relato';

const ETAPAS: { estado: EstadoSolicitacao; rotulo: string }[] = [
  { estado: 'enviada', rotulo: 'Pedido enviado' },
  { estado: 'em_analise', rotulo: 'Clínica analisando' },
  { estado: 'aguardando_confirmacao', rotulo: 'Aguardando confirmação de vaga' },
  { estado: 'agendada', rotulo: 'Agendada pela clínica' },
  { estado: 'concluida', rotulo: 'Atendimento concluído' },
];

function indiceEtapa(estado: EstadoSolicitacao | null | undefined) {
  if (estado === 'precisa_contato') return 1; // é uma pausa dentro da análise
  return ETAPAS.findIndex((e) => e.estado === estado);
}

const EXPLICACAO: Record<EstadoSolicitacao, string> = {
  enviada: 'A clínica ainda não abriu o seu pedido.',
  em_analise: 'A clínica está analisando o seu pedido. Isso ainda não é um agendamento.',
  precisa_contato: 'A clínica precisa de alguma informação sua para continuar.',
  aguardando_confirmacao:
    'Você demonstrou interesse em uma vaga. Falta a clínica confirmar: ainda não é agendamento.',
  agendada: 'A clínica confirmou o seu atendimento.',
  concluida: 'O atendimento foi concluído.',
  indisponivel: 'A clínica não pode atender este pedido.',
};

function descreverEvento(e: EventoSolicitacao) {
  switch (e.tipo) {
    case 'criada':
      return 'Pedido criado';
    case 'encaminhamento_escolhido':
      return 'Você escolheu enviar para outra clínica';
    case 'interesse_registrado':
      return 'Você demonstrou interesse em uma vaga';
    case 'confirmacao':
      return 'A clínica confirmou a vaga';
    default:
      return e.estado_novo ? `Mudou para: ${ROTULO_ESTADO[e.estado_novo] ?? e.estado_novo}` : 'Atualização';
  }
}

const AUTOR = { paciente: 'Você', funcionario: 'Clínica', sistema: 'Sistema' } as const;

export function StatusPedido({ route, navigation }: NativeStackScreenProps<RotasRaiz, 'StatusPedido'>) {
  const { solicitacaoId } = route.params;
  const { cores, fs } = useTema();
  const { dados, erro, carregando, atualizando, atualizar, recarregar } = useCarregar(async () => {
    const [pedido, eventos] = await Promise.all([
      apiSolicitacoes.obter(solicitacaoId),
      apiSolicitacoes.eventos(solicitacaoId),
    ]);
    const clinica = await apiClinicas.obter(pedido.clinica_id).catch(() => null);
    return { pedido, eventos: eventos.itens, clinica };
  }, [solicitacaoId]);

  if (carregando) return <Carregando texto="Abrindo pedido…" />;
  if (erro || !dados) return <ErroComRetry mensagem={erro ?? 'Pedido não encontrado.'} aoTentar={recarregar} />;

  const { pedido, eventos, clinica } = dados;
  const indisponivel = pedido.estado === 'indisponivel';
  // Último evento que trouxe o estado atual: motivo administrativo, se houver.
  const ultimo = [...eventos].reverse().find((e) => e.estado_novo === pedido.estado);
  const atual = indisponivel ? indiceEtapa(ultimo?.estado_anterior) : indiceEtapa(pedido.estado);
  const etapas = indisponivel ? ETAPAS.slice(0, atual + 1) : ETAPAS;
  const temAlternativas = ROTAS_MODULOS.some((r) => r.nome === ROTA_ALTERNATIVAS);
  const temVagas = ROTAS_MODULOS.some((r) => r.nome === ROTA_VAGAS) && ESTADOS_COM_VAGAS.includes(pedido.estado);
  const temUrgencia =
    ROTAS_MODULOS.some((r) => r.nome === ROTA_URGENCIA) && !['indisponivel', 'concluida'].includes(pedido.estado);

  return (
    <Tela aoAtualizar={atualizar} atualizando={atualizando}>
      <Texto variante="titulo">{clinica?.nome ?? 'Seu pedido'}</Texto>
      <Texto variante="apoio">
        {rotuloEspecialidade(pedido.especialidade)} · enviado em {formatarDataHora(pedido.criado_em)}
      </Texto>

      <Cartao destaque>
        <Texto variante="apoio">Situação agora</Texto>
        <Texto variante="tituloCartao">{ROTULO_ESTADO[pedido.estado] ?? pedido.estado}</Texto>
        <Texto>{EXPLICACAO[pedido.estado]}</Texto>
        {ultimo?.motivo && <Texto variante="negrito">Motivo informado: {ultimo.motivo}</Texto>}
      </Cartao>

      {pedido.estado === 'precisa_contato' && clinica && (
        <Botao rotulo="Abrir discador da clínica" icone="call" variante="contorno" onPress={() => abrirDiscador(clinica.telefone)} dica={AVISOS.discador} />
      )}

      {temVagas && (
        <Botao
          rotulo="Ver vagas informadas pela clínica"
          icone="event-available"
          variante="contorno"
          onPress={() => navigation.navigate(ROTA_VAGAS, { clinicaId: pedido.clinica_id, solicitacaoId })}
          dica="Mostrar interesse em uma vaga não é agendamento. A clínica confirma uma única pessoa."
        />
      )}

      {indisponivel && (
        <View style={{ gap: ESPACO[3] }}>
          <Aviso tom="aviso" titulo="Você decide o próximo passo">
            Nada foi enviado a outra clínica. Se quiser, você pode escolher outra clínica e fazer um novo pedido.
          </Aviso>
          {temAlternativas ? (
            <Botao rotulo="Ver clínicas sugeridas" icone="alt-route" onPress={() => navigation.navigate(ROTA_ALTERNATIVAS, { solicitacaoId })} />
          ) : (
            <Botao rotulo="Ver outras clínicas" icone="search" variante="contorno" onPress={() => navigation.popTo('Abas')} />
          )}
        </View>
      )}

      {pedido.solicitacao_origem_id && (
        <Cartao onPress={() => navigation.push('StatusPedido', { solicitacaoId: pedido.solicitacao_origem_id! })} rotuloAcessivel="Ver o pedido anterior">
          <Texto>Este pedido veio de outro que você escolheu encaminhar.</Texto>
          <Texto variante="negrito" cor={cores.link}>
            Ver pedido anterior
          </Texto>
        </Cartao>
      )}

      <View style={{ gap: ESPACO[2] }}>
        <Texto variante="tituloCartao">Caminho do pedido</Texto>
        <View accessibilityRole="list">
          {etapas.map((etapa, i) => {
            const feita = i < atual || (i === atual && pedido.estado === 'concluida');
            const agora = i === atual && !indisponivel;
            return (
              <Etapa
                key={etapa.estado}
                rotulo={etapa.rotulo + (agora && pedido.estado === 'precisa_contato' ? ' (precisa falar com você)' : '')}
                situacao={feita || (indisponivel && i <= atual) ? 'feita' : agora ? 'agora' : 'futura'}
                ultima={!indisponivel && i === etapas.length - 1}
              />
            );
          })}
          {indisponivel && <Etapa rotulo="Clínica não pode atender" situacao="interrompida" ultima />}
        </View>
      </View>

      <View style={{ gap: ESPACO[2] }}>
        <Texto variante="tituloCartao">Histórico</Texto>
        {eventos.map((e) => (
          <View key={e.id} style={{ borderLeftWidth: 3, borderLeftColor: cores.linha, paddingLeft: ESPACO[3], gap: 2 }}>
            <Texto variante="negrito">{descreverEvento(e)}</Texto>
            <Texto variante="apoio">
              {formatarDataHora(e.criado_em)} · {AUTOR[e.autor_papel] ?? e.autor_papel}
            </Texto>
            {e.motivo && <Texto variante="apoio">Motivo: {e.motivo}</Texto>}
          </View>
        ))}
      </View>

      {temUrgencia && (
        <Botao
          rotulo="Estou com uma urgência"
          icone="priority-high"
          variante="contorno"
          onPress={() => navigation.navigate(ROTA_URGENCIA, { solicitacaoId })}
          dica="Avisa a clínica para um profissional avaliar. Em emergência, ligue 192 (SAMU)."
        />
      )}

      <Aviso>{AVISOS.semPush}</Aviso>
      <Botao rotulo="Atualizar" icone="refresh" variante="contorno" onPress={atualizar} carregando={atualizando} />
    </Tela>
  );
}

function Etapa({
  rotulo,
  situacao,
  ultima,
}: {
  rotulo: string;
  situacao: 'feita' | 'agora' | 'futura' | 'interrompida';
  ultima?: boolean;
}) {
  const { cores, fs } = useTema();
  const icone = { feita: 'check-circle', agora: 'radio-button-checked', futura: 'radio-button-unchecked', interrompida: 'cancel' }[
    situacao
  ] as 'check-circle';
  const cor = { feita: cores.link, agora: cores.link, futura: cores.bordaForte, interrompida: cores.perigo }[situacao];
  const prefixo = { feita: 'Feito', agora: 'Agora', futura: 'Próximo', interrompida: 'Encerrado' }[situacao];
  return (
    <View accessible accessibilityLabel={`${prefixo}: ${rotulo}`} style={{ flexDirection: 'row', gap: ESPACO[3] }}>
      <View style={{ alignItems: 'center' }}>
        <MaterialIcons name={icone} size={fs(26)} color={cor} />
        {!ultima && <View style={{ width: 2, flex: 1, minHeight: ESPACO[4], backgroundColor: cores.linha }} />}
      </View>
      <View style={{ flex: 1, paddingBottom: ESPACO[3] }}>
        <Texto variante={situacao === 'agora' || situacao === 'interrompida' ? 'negrito' : 'corpo'} cor={situacao === 'futura' ? cores.apagado : undefined}>
          {rotulo}
        </Texto>
        {situacao === 'agora' && <Texto variante="apoio">Você está aqui</Texto>}
      </View>
    </View>
  );
}
