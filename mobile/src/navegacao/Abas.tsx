import { MaterialIcons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { BotaoTamanhoTexto } from '../componentes';
import { useTema } from '../tema/TemaContext';
import { FONTES } from '../tema/tokens';
import { Ajustes } from '../telas/Ajustes';
import { ListaClinicas } from '../telas/ListaClinicas';
import { MeusPedidos } from '../telas/MeusPedidos';
import { ROTAS_MODULOS } from './modulos';
import type { RotasAbas } from './tipos';

const Tab = createBottomTabNavigator<RotasAbas>();

type Icone = keyof typeof MaterialIcons.glyphMap;

export function Abas() {
  const { cores, fs } = useTema();
  const icone = (nome: Icone) =>
    function IconeAba({ color }: { color: string }) {
      return <MaterialIcons name={nome} size={fs(26)} color={color} />;
    };

  return (
    <Tab.Navigator
      screenOptions={{
        headerRight: () => <BotaoTamanhoTexto />,
        headerTitleStyle: { fontFamily: FONTES.titulo, fontSize: fs(20) },
        tabBarActiveTintColor: cores.link,
        tabBarInactiveTintColor: cores.apagado,
        tabBarLabelStyle: { fontFamily: FONTES.corpoNegrito, fontSize: Math.min(fs(13), 18) },
        tabBarStyle: { minHeight: 64, backgroundColor: cores.superficie, borderTopColor: cores.linha },
      }}
    >
      <Tab.Screen name="Clinicas" component={ListaClinicas} options={{ title: 'Clínicas', tabBarIcon: icone('local-hospital') }} />
      <Tab.Screen name="Pedidos" component={MeusPedidos} options={{ title: 'Meus pedidos', tabBarIcon: icone('assignment') }} />
      {ROTAS_MODULOS.filter((r) => r.aba).map((r) => (
        <Tab.Screen
          key={r.nome}
          name={r.nome}
          component={r.componente}
          options={{ title: r.aba!.rotulo, headerTitle: r.titulo ?? r.aba!.rotulo, tabBarIcon: icone(r.aba!.icone as Icone) }}
        />
      ))}
      <Tab.Screen name="Ajustes" component={Ajustes} options={{ title: 'Ajustes', tabBarIcon: icone('settings') }} />
    </Tab.Navigator>
  );
}
