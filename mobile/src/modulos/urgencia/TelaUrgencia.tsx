import React, { useState } from 'react';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { AVISO_DEMO, ORIENTACAO_EMERGENCIA, SAMU } from './textos';
import type { ClienteUrgencia, RelatoUrgencia } from './tipos';

interface Props {
  cliente: ClienteUrgencia;
  solicitacaoId?: string | null;
}

/** O bloco de emergência é estático: aparece sempre, antes e independente de qualquer chamada. */
export function TelaUrgencia({ cliente, solicitacaoId = null }: Props) {
  const [relato, setRelato] = useState<RelatoUrgencia | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function relatar() {
    setEnviando(true);
    setErro(null);
    try {
      setRelato(await cliente.relatar(solicitacaoId));
    } catch (e) {
      setErro(`${(e as Error).message} Se for grave, ligue ${SAMU} (SAMU).`);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
      <View accessibilityRole="alert" style={{ borderWidth: 2, borderColor: '#b00020', borderRadius: 8, padding: 16 }}>
        <Text style={{ fontWeight: '700', fontSize: 18 }}>Emergência? Não espere.</Text>
        <Text style={{ fontSize: 16, marginVertical: 8 }}>{ORIENTACAO_EMERGENCIA}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Ligar para o SAMU, ${SAMU}`}
          onPress={() => Linking.openURL(`tel:${SAMU}`)}
          style={{ backgroundColor: '#b00020', padding: 14, borderRadius: 8 }}
        >
          <Text style={{ color: '#fff', fontSize: 18, textAlign: 'center' }}>Ligar {SAMU} (SAMU)</Text>
        </Pressable>
      </View>

      <Text style={{ fontSize: 16 }}>
        Precisa de ajuda, mas não é uma emergência? Avise a clínica. Um profissional vai avaliar seu relato.
      </Text>

      {relato ? (
        <View accessibilityLiveRegion="polite">
          <Text style={{ fontWeight: '700', fontSize: 16 }}>{relato.rotulo}</Text>
          <Text style={{ fontSize: 16 }}>{relato.aviso}</Text>
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          disabled={enviando}
          onPress={relatar}
          style={{ backgroundColor: '#1f4e8c', padding: 14, borderRadius: 8, opacity: enviando ? 0.6 : 1 }}
        >
          <Text style={{ color: '#fff', fontSize: 18, textAlign: 'center' }}>Preciso de ajuda urgente</Text>
        </Pressable>
      )}
      {erro && <Text accessibilityRole="alert" style={{ color: '#b00020', fontSize: 16 }}>{erro}</Text>}
      <Text style={{ fontSize: 13, color: '#555' }}>{AVISO_DEMO}</Text>
    </ScrollView>
  );
}
