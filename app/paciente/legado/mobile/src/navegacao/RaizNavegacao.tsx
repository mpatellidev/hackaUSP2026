import { DarkTheme, DefaultTheme, NavigationContainer, type Theme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { BotaoTamanhoTexto, Carregando } from '../componentes';
import { useSessao } from '../sessao/SessaoContext';
import { useTema } from '../tema/TemaContext';
import { FONTES } from '../tema/tokens';
import { BoasVindas } from '../telas/BoasVindas';
import { ConfirmarPedido } from '../telas/ConfirmarPedido';
import { DetalheClinica } from '../telas/DetalheClinica';
import { EscolhaCidade } from '../telas/EscolhaCidade';
import { IdentificacaoDemo } from '../telas/IdentificacaoDemo';
import { PedidoEnviado } from '../telas/PedidoEnviado';
import { StatusPedido } from '../telas/StatusPedido';
import { Abas } from './Abas';
import { ROTAS_MODULOS } from './modulos';
import type { RotasRaiz } from './tipos';

const Stack = createNativeStackNavigator<RotasRaiz>();

export function RaizNavegacao() {
  const { pronto, usuario } = useSessao();
  const { cores, nome, fs } = useTema();

  const base = nome === 'escuro' ? DarkTheme : DefaultTheme;
  const tema: Theme = {
    ...base,
    colors: {
      ...base.colors,
      primary: cores.link,
      background: cores.fundo,
      card: cores.superficie,
      text: cores.texto,
      border: cores.linha,
      notification: cores.perigo,
    },
  };

  if (!pronto) return <Carregando texto="Abrindo o UHealth…" />;

  return (
    <NavigationContainer theme={tema}>
      <Stack.Navigator
        screenOptions={{
          headerTitleStyle: { fontFamily: FONTES.titulo, fontSize: fs(20) },
          headerTintColor: cores.link,
          headerRight: () => <BotaoTamanhoTexto />,
          headerBackButtonDisplayMode: 'minimal',
        }}
      >
        {!usuario ? (
          <>
            <Stack.Screen name="BoasVindas" component={BoasVindas} options={{ headerShown: false }} />
            <Stack.Screen name="Identificacao" component={IdentificacaoDemo} options={{ title: 'Entrar (demonstração)' }} />
          </>
        ) : (
          <>
            <Stack.Screen name="Abas" component={Abas} options={{ headerShown: false }} />
            <Stack.Screen name="EscolhaCidade" component={EscolhaCidade} options={{ title: 'Escolher cidade' }} />
            <Stack.Screen name="DetalheClinica" component={DetalheClinica} options={{ title: 'Clínica' }} />
            <Stack.Screen name="ConfirmarPedido" component={ConfirmarPedido} options={{ title: 'Pedir atendimento' }} />
            <Stack.Screen
              name="PedidoEnviado"
              component={PedidoEnviado}
              options={{ title: 'Pedido enviado', headerBackVisible: false, gestureEnabled: false }}
            />
            <Stack.Screen name="StatusPedido" component={StatusPedido} options={{ title: 'Andamento do pedido' }} />
            {ROTAS_MODULOS.filter((r) => !r.aba).map((r) => (
              <Stack.Screen key={r.nome} name={r.nome} component={r.componente} options={{ title: r.titulo }} />
            ))}
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
