import { AtkinsonHyperlegible_400Regular, AtkinsonHyperlegible_700Bold } from '@expo-google-fonts/atkinson-hyperlegible';
import { Lexend_500Medium, Lexend_700Bold } from '@expo-google-fonts/lexend';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaInsetsContext, SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { BannerOrigem } from './src/componentes';
import { RaizNavegacao } from './src/navegacao/RaizNavegacao';
import { SessaoProvider } from './src/sessao/SessaoContext';
import { TemaProvider, useTema } from './src/tema/TemaContext';

export default function App() {
  const [fontesProntas, erroFontes] = useFonts({
    Lexend_500Medium,
    Lexend_700Bold,
    AtkinsonHyperlegible_400Regular,
    AtkinsonHyperlegible_700Bold,
  });
  // Sem as fontes, segue com a do sistema em vez de travar.
  if (!fontesProntas && !erroFontes) return null;

  return (
    <SafeAreaProvider>
      <TemaProvider>
        <SessaoProvider>
          <Conteudo />
        </SessaoProvider>
      </TemaProvider>
    </SafeAreaProvider>
  );
}

function Conteudo() {
  const { cores, nome } = useTema();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: cores.fundo }}>
      <StatusBar style={nome === 'escuro' ? 'light' : 'dark'} />
      {/* Aviso fixo de demonstração/mock acima de todas as telas. */}
      <SafeAreaView edges={['top']} style={{ backgroundColor: cores.superficie }}>
        <BannerOrigem />
      </SafeAreaView>
      {/* O banner já ocupa o espaço da barra de status; os cabeçalhos não precisam somar de novo. */}
      <SafeAreaInsetsContext.Provider value={{ ...insets, top: 0 }}>
        <RaizNavegacao />
      </SafeAreaInsetsContext.Provider>
    </View>
  );
}
