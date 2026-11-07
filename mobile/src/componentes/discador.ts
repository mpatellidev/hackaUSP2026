import { Alert, Linking } from 'react-native';

/** Só abre o discador do celular com o número preenchido. Não liga sozinho. */
export async function abrirDiscador(telefone: string) {
  const url = `tel:${telefone.replace(/[^\d+]/g, '')}`;
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert('Não foi possível abrir o telefone', `Disque manualmente: ${telefone}`);
  }
}
