import { MaterialIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { View } from 'react-native';

import { Aviso, Botao, Tela, Texto } from '../componentes';
import type { RotasRaiz } from '../navegacao/tipos';
import { useTema } from '../tema/TemaContext';
import { ESPACO } from '../tema/tokens';
import { AVISOS } from '../textos/avisos';

export function PedidoEnviado({ route, navigation }: NativeStackScreenProps<RotasRaiz, 'PedidoEnviado'>) {
  const { cores, fs } = useTema();
  return (
    <Tela>
      <View style={{ alignItems: 'center', gap: ESPACO[2], paddingVertical: ESPACO[4] }}>
        <MaterialIcons name="mark-email-read" size={fs(64)} color={cores.link} />
        <Texto variante="titulo" style={{ textAlign: 'center' }}>
          Pedido enviado
        </Texto>
        <Texto style={{ textAlign: 'center' }}>A clínica recebeu o seu pedido e vai analisar.</Texto>
      </View>
      <Aviso tom="aviso" titulo="Ainda não é agendamento">
        {AVISOS.pedidoNaoEAgendamento}
      </Aviso>
      <Aviso>{AVISOS.semPush}</Aviso>
      <Botao
        rotulo="Acompanhar pedido"
        icone="timeline"
        onPress={() => navigation.replace('StatusPedido', { solicitacaoId: route.params.solicitacaoId })}
      />
      <Botao
        rotulo="Voltar para as clínicas"
        variante="contorno"
        onPress={() => navigation.popTo('Abas')}
      />
    </Tela>
  );
}
