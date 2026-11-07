import { MaterialIcons } from '@expo/vector-icons';
import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { MODO_CONFIGURADO, origemAtual, ouvirOrigem, type OrigemDados } from '../api';
import { useTema } from '../tema/TemaContext';
import { ALVO_MINIMO, ESPACO } from '../tema/tokens';
import { AVISOS } from '../textos/avisos';
import { abrirDiscador } from './discador';
import { Texto } from './Texto';

type Tom = 'info' | 'aviso' | 'perigo';

export function Aviso({ tom = 'info', titulo, children }: { tom?: Tom; titulo?: string; children: ReactNode }) {
  const { cores, fs, nome } = useTema();
  const fundo = { info: cores.chipFundo, aviso: cores.avisoFundo, perigo: cores.perigoFundo }[tom];
  const texto = { info: cores.chipTexto, aviso: cores.avisoTexto, perigo: cores.perigoTexto }[tom];
  const icone = ({ info: 'info-outline', aviso: 'warning-amber', perigo: 'error-outline' } as const)[tom];
  return (
    <View
      accessible
      accessibilityRole={tom === 'info' ? 'text' : 'alert'}
      style={[estilos.aviso, { backgroundColor: fundo, borderColor: nome === 'alto_contraste' ? '#000' : fundo }]}
    >
      <MaterialIcons name={icone} size={fs(22)} color={texto} />
      <View style={{ flex: 1, gap: ESPACO[1] }}>
        {titulo && (
          <Texto variante="negrito" cor={texto}>
            {titulo}
          </Texto>
        )}
        {typeof children === 'string' ? <Texto cor={texto}>{children}</Texto> : children}
      </View>
    </View>
  );
}

/** Faixa estática de emergência. Não depende de rede, IA, vaga ou fila. */
export function FaixaEmergencia() {
  const { cores, fs } = useTema();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Emergência: ligar 192, SAMU"
      accessibilityHint="Abre o telefone com o número 192 digitado"
      onPress={() => abrirDiscador('192')}
      style={[estilos.emergencia, { borderColor: cores.perigo, backgroundColor: cores.perigoFundo }]}
    >
      <MaterialIcons name="local-hospital" size={fs(24)} color={cores.perigoTexto} />
      <Texto variante="negrito" cor={cores.perigoTexto} style={{ flex: 1 }}>
        {AVISOS.emergencia}
      </Texto>
      <MaterialIcons name="call" size={fs(22)} color={cores.perigoTexto} />
    </Pressable>
  );
}

const TEXTO_ORIGEM: Record<OrigemDados, string> = {
  api: 'Demonstração · dados fictícios do servidor',
  mock: 'Modo demonstração (mock) · dados fictícios no aparelho',
  mock_fallback: 'Sem resposta da API para esta parte · mostrando dados de demonstração (mock)',
};

/** Aviso fixo de origem dos dados: mock/demo sempre identificado na tela. */
export function BannerOrigem() {
  const { cores, fs } = useTema();
  const [origem, setOrigem] = useState<OrigemDados>(origemAtual() ?? (MODO_CONFIGURADO === 'api' ? 'api' : 'mock'));
  useEffect(() => ouvirOrigem(setOrigem), []);
  const fallback = origem === 'mock_fallback';
  return (
    <View
      accessible
      accessibilityLabel={TEXTO_ORIGEM[origem]}
      style={[estilos.banner, { backgroundColor: fallback ? cores.avisoFundo : cores.chipFundo }]}
    >
      <MaterialIcons
        name={fallback ? 'cloud-off' : 'science'}
        size={fs(16)}
        color={fallback ? cores.avisoTexto : cores.chipTexto}
      />
      <Texto variante="apoio" cor={fallback ? cores.avisoTexto : cores.chipTexto} style={{ flex: 1 }}>
        {TEXTO_ORIGEM[origem]}
      </Texto>
    </View>
  );
}

export function SeloDemo() {
  const { cores } = useTema();
  return (
    <View style={[estilos.selo, { borderColor: cores.bordaForte }]}>
      <Texto variante="apoio">Conta fictícia · demonstração</Texto>
    </View>
  );
}

const estilos = StyleSheet.create({
  aviso: { flexDirection: 'row', gap: ESPACO[3], padding: ESPACO[4], borderRadius: 14, borderWidth: 2 },
  emergencia: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ESPACO[3],
    padding: ESPACO[3],
    borderRadius: 14,
    borderWidth: 2,
    minHeight: ALVO_MINIMO,
  },
  banner: { flexDirection: 'row', alignItems: 'center', gap: ESPACO[2], paddingHorizontal: ESPACO[4], paddingVertical: ESPACO[1] },
  selo: { alignSelf: 'flex-start', borderWidth: 1.5, borderRadius: 999, paddingHorizontal: ESPACO[3], paddingVertical: 2 },
});
