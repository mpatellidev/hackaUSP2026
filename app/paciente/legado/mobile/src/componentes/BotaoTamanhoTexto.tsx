import { Pressable } from 'react-native';

import { useTema } from '../tema/TemaContext';
import { ALVO_MINIMO, type TamanhoTexto } from '../tema/tokens';
import { Texto } from './Texto';

const PROXIMO: Record<TamanhoTexto, TamanhoTexto> = { normal: 'grande', grande: 'extra_grande', extra_grande: 'normal' };
const NOME: Record<TamanhoTexto, string> = { normal: 'normal', grande: 'grande', extra_grande: 'extra grande' };

/** Botão "Aa" do cabeçalho: alterna normal → grande → extra grande. */
export function BotaoTamanhoTexto() {
  const { tamanho, definirTamanho, cores } = useTema();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Tamanho das letras: ${NOME[tamanho]}. Tocar para mudar.`}
      onPress={() => definirTamanho(PROXIMO[tamanho])}
      hitSlop={8}
      style={{ minWidth: ALVO_MINIMO, minHeight: ALVO_MINIMO, alignItems: 'center', justifyContent: 'center' }}
    >
      <Texto variante="tituloCartao" cor={cores.link} style={{ fontSize: 20, lineHeight: 24 }} allowFontScaling={false}>
        Aa
      </Texto>
    </Pressable>
  );
}
