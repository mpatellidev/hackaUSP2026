import { Text, type TextProps } from 'react-native';

import { useTema } from '../tema/TemaContext';
import { FONTES, TAMANHO } from '../tema/tokens';

type Variante = 'titulo' | 'tituloCartao' | 'corpo' | 'negrito' | 'apoio';

const ESTILO: Record<Variante, { fontFamily: string; base: number; apagado?: boolean }> = {
  titulo: { fontFamily: FONTES.titulo, base: TAMANHO.titulo },
  tituloCartao: { fontFamily: FONTES.titulo, base: TAMANHO.tituloCartao },
  corpo: { fontFamily: FONTES.corpo, base: TAMANHO.corpo },
  negrito: { fontFamily: FONTES.corpoNegrito, base: TAMANHO.corpo },
  apoio: { fontFamily: FONTES.corpo, base: TAMANHO.apoio, apagado: true },
};

interface Props extends TextProps {
  variante?: Variante;
  cor?: string;
}

/** Texto com fonte, cor e escala do tema. Mantém também o ajuste de fonte do sistema (allowFontScaling). */
export function Texto({ variante = 'corpo', cor, style, ...resto }: Props) {
  const { cores, fs, escala } = useTema();
  const e = ESTILO[variante];
  const titulo = variante === 'titulo' || variante === 'tituloCartao';
  return (
    <Text
      accessibilityRole={titulo ? 'header' : undefined}
      maxFontSizeMultiplier={2}
      style={[
        {
          fontFamily: e.fontFamily,
          fontSize: fs(e.base),
          lineHeight: Math.round(fs(e.base) * (escala > 1.5 ? 1.45 : titulo ? 1.25 : 1.5)),
          color: cor ?? (e.apagado ? cores.apagado : cores.texto),
        },
        style,
      ]}
      {...resto}
    />
  );
}
