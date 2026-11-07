import { MaterialIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTema } from '../tema/TemaContext';
import { ALVO_MINIMO, ESPACO } from '../tema/tokens';
import { Texto } from './Texto';

interface Props {
  rotulo: string;
  descricao?: string;
  selecionada: boolean;
  onPress: () => void;
}

/** Linha de escolha única (radio), com alvo de toque grande. */
export function Opcao({ rotulo, descricao, selecionada, onPress }: Props) {
  const { cores, fs, nome } = useTema();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selecionada }}
      accessibilityLabel={descricao ? `${rotulo}. ${descricao}` : rotulo}
      onPress={onPress}
      style={({ pressed }) => [
        estilos.linha,
        {
          backgroundColor: selecionada ? cores.chipFundo : cores.superficie,
          borderColor: selecionada ? cores.link : cores.linha,
          borderWidth: nome === 'alto_contraste' || selecionada ? 2 : 1.5,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <MaterialIcons
        name={selecionada ? 'radio-button-checked' : 'radio-button-unchecked'}
        size={fs(24)}
        color={selecionada ? cores.link : cores.bordaForte}
      />
      <View style={{ flex: 1 }}>
        <Texto variante={selecionada ? 'negrito' : 'corpo'}>{rotulo}</Texto>
        {descricao && <Texto variante="apoio">{descricao}</Texto>}
      </View>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACO[3],
    minHeight: ALVO_MINIMO + 8,
    paddingHorizontal: ESPACO[4],
    paddingVertical: ESPACO[2],
    borderRadius: 14,
  },
});
