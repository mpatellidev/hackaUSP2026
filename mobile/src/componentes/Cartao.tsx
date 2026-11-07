import { MaterialIcons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { useTema } from '../tema/TemaContext';
import { ESPACO, TAMANHO } from '../tema/tokens';
import { Texto } from './Texto';

interface CartaoProps {
  children: ReactNode;
  onPress?: () => void;
  rotuloAcessivel?: string;
  destaque?: boolean;
  style?: ViewStyle;
}

export function Cartao({ children, onPress, rotuloAcessivel, destaque, style }: CartaoProps) {
  const { cores, nome } = useTema();
  const visual: ViewStyle = {
    backgroundColor: cores.superficie,
    borderColor: destaque ? cores.link : cores.linha,
    borderWidth: nome === 'alto_contraste' ? 3 : destaque ? 2 : 1.5,
    borderRadius: nome === 'alto_contraste' ? 8 : 20,
  };
  if (!onPress) return <View style={[estilos.cartao, visual, style]}>{children}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={rotuloAcessivel}
      onPress={onPress}
      style={({ pressed }) => [estilos.cartao, visual, { opacity: pressed ? 0.85 : 1 }, style]}
    >
      {children}
    </Pressable>
  );
}

type Tom = 'normal' | 'aviso' | 'perigo';

export function Chip({ rotulo, tom = 'normal', icone }: { rotulo: string; tom?: Tom; icone?: keyof typeof MaterialIcons.glyphMap }) {
  const { cores, fs, nome } = useTema();
  const fundo = { normal: cores.chipFundo, aviso: cores.avisoFundo, perigo: cores.perigoFundo }[tom];
  const texto = { normal: cores.chipTexto, aviso: cores.avisoTexto, perigo: cores.perigoTexto }[tom];
  return (
    <View
      style={[
        estilos.chip,
        { backgroundColor: fundo, borderColor: nome === 'alto_contraste' ? '#000' : 'transparent' },
      ]}
    >
      {icone && <MaterialIcons name={icone} size={fs(16)} color={texto} />}
      <Texto variante="negrito" cor={texto} style={{ fontSize: fs(TAMANHO.apoio) }}>
        {rotulo}
      </Texto>
    </View>
  );
}

export function LinhaChips({ children }: { children: ReactNode }) {
  return <View style={estilos.linhaChips}>{children}</View>;
}

const estilos = StyleSheet.create({
  cartao: { padding: ESPACO[4], gap: ESPACO[3] },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACO[1],
    paddingHorizontal: ESPACO[3],
    paddingVertical: ESPACO[1],
    borderRadius: 999,
    borderWidth: 1.5,
  },
  linhaChips: { flexDirection: 'row', flexWrap: 'wrap', gap: ESPACO[2] },
});
