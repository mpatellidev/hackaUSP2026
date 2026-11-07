import { MaterialIcons } from '@expo/vector-icons';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useTema } from '../tema/TemaContext';
import { ESPACO } from '../tema/tokens';
import { Botao } from './Botao';
import { Texto } from './Texto';

export function Carregando({ texto = 'Carregando…' }: { texto?: string }) {
  const { cores } = useTema();
  return (
    <View style={estilos.centro} accessibilityRole="progressbar" accessibilityLabel={texto}>
      <ActivityIndicator size="large" color={cores.link} />
      <Texto variante="apoio">{texto}</Texto>
    </View>
  );
}

export function ErroComRetry({ mensagem, aoTentar }: { mensagem: string; aoTentar: () => void }) {
  const { cores, fs } = useTema();
  return (
    <View style={estilos.centro} accessibilityRole="alert">
      <MaterialIcons name="error-outline" size={fs(40)} color={cores.perigo} />
      <Texto style={{ textAlign: 'center' }}>{mensagem}</Texto>
      <Botao rotulo="Tentar de novo" icone="refresh" variante="contorno" onPress={aoTentar} />
    </View>
  );
}

export function Vazio({ texto }: { texto: string }) {
  const { cores, fs } = useTema();
  return (
    <View style={estilos.centro}>
      <MaterialIcons name="inbox" size={fs(40)} color={cores.apagado} />
      <Texto variante="apoio" style={{ textAlign: 'center' }}>
        {texto}
      </Texto>
    </View>
  );
}

const estilos = StyleSheet.create({
  centro: { alignItems: 'center', justifyContent: 'center', gap: ESPACO[3], padding: ESPACO[6] },
});
