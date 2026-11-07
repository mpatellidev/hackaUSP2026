import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { View } from 'react-native';

import { Aviso, Botao, FaixaEmergencia, SeloDemo, Tela, Texto } from '../componentes';
import type { RotasRaiz } from '../navegacao/tipos';
import { useTema } from '../tema/TemaContext';
import { ESPACO } from '../tema/tokens';
import { AVISOS } from '../textos/avisos';

export function BoasVindas({ navigation }: NativeStackScreenProps<RotasRaiz, 'BoasVindas'>) {
  const { cores, nome } = useTema();
  return (
    <Tela>
      <View
        style={{
          backgroundColor: cores.marca,
          borderRadius: nome === 'alto_contraste' ? 8 : 28,
          padding: ESPACO[6],
          gap: ESPACO[2],
        }}
      >
        <Texto variante="titulo" cor={cores.naMarca}>
          UHealth
        </Texto>
        <Texto cor={cores.naMarca}>
          Encontre clínicas-escola de saúde na sua cidade, peça atendimento e acompanhe o seu pedido.
        </Texto>
      </View>

      <SeloDemo />

      <View style={{ gap: ESPACO[2] }}>
        <Texto variante="tituloCartao">Como funciona</Texto>
        <Texto>1. Você escolhe a sua cidade e vê as clínicas-escola.</Texto>
        <Texto>2. Envia um pedido para a clínica que quiser.</Texto>
        <Texto>3. A clínica analisa e você acompanha aqui no app.</Texto>
      </View>

      <Aviso tom="aviso" titulo="Antes de começar">
        {AVISOS.limites}
      </Aviso>

      <FaixaEmergencia />

      <Botao rotulo="Começar" icone="arrow-forward" onPress={() => navigation.navigate('Identificacao')} />
    </Tela>
  );
}
