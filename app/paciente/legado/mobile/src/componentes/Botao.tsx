import { MaterialIcons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { useTema } from '../tema/TemaContext';
import { ALVO_MINIMO, ESPACO, TAMANHO } from '../tema/tokens';
import { Texto } from './Texto';

type Variante = 'primario' | 'contorno' | 'sol' | 'perigo';

interface Props {
  rotulo: string;
  onPress: () => void;
  variante?: Variante;
  icone?: keyof typeof MaterialIcons.glyphMap;
  desabilitado?: boolean;
  carregando?: boolean;
  dica?: string;
}

export function Botao({ rotulo, onPress, variante = 'primario', icone, desabilitado, carregando, dica }: Props) {
  const { cores, fs, nome } = useTema();
  const fundo = { primario: cores.marca, contorno: 'transparent', sol: cores.sol, perigo: cores.perigo }[variante];
  const texto = {
    primario: cores.naMarca,
    contorno: cores.link,
    sol: '#0b2423',
    perigo: nome === 'escuro' ? '#3a1411' : '#ffffff',
  }[variante];
  const inativo = desabilitado || carregando;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      accessibilityHint={dica}
      accessibilityState={{ disabled: !!inativo, busy: !!carregando }}
      disabled={inativo}
      onPress={onPress}
      style={({ pressed }) => [
        estilos.base,
        {
          backgroundColor: fundo,
          borderColor: variante === 'contorno' ? cores.link : nome === 'alto_contraste' ? '#000' : 'transparent',
          borderRadius: nome === 'alto_contraste' ? 8 : 14,
          minHeight: Math.max(ALVO_MINIMO, fs(52)),
          opacity: inativo ? 0.55 : pressed ? 0.85 : 1,
        },
      ]}
    >
      {carregando ? (
        <ActivityIndicator color={texto} />
      ) : (
        <View style={estilos.conteudo}>
          {icone && <MaterialIcons name={icone} size={fs(22)} color={texto} />}
          <Texto variante="negrito" cor={texto} style={{ fontSize: fs(TAMANHO.botao), textAlign: 'center' }}>
            {rotulo}
          </Texto>
        </View>
      )}
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  base: {
    borderWidth: 2,
    paddingHorizontal: ESPACO[5],
    paddingVertical: ESPACO[2],
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  conteudo: { flexDirection: 'row', alignItems: 'center', gap: ESPACO[2], flexShrink: 1 },
});
