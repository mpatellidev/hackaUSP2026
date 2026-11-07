import type { ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleSheet } from 'react-native';

import { useTema } from '../tema/TemaContext';
import { ESPACO } from '../tema/tokens';

interface Props {
  children: ReactNode;
  /** Se informado, habilita "puxar para atualizar". */
  aoAtualizar?: () => void;
  atualizando?: boolean;
}

/** Conteúdo rolável padrão das telas. */
export function Tela({ children, aoAtualizar, atualizando = false }: Props) {
  const { cores } = useTema();
  return (
    <ScrollView
      style={{ backgroundColor: cores.fundo }}
      contentContainerStyle={estilos.conteudo}
      refreshControl={
        aoAtualizar ? (
          <RefreshControl refreshing={atualizando} onRefresh={aoAtualizar} colors={[cores.link]} tintColor={cores.link} />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  conteudo: { padding: ESPACO[5], gap: ESPACO[4], paddingBottom: ESPACO[6] * 2 },
});
