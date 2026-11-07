import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { View } from 'react-native';

import { API_URL, MODO_CONFIGURADO } from '../api';
import { Aviso, Botao, Cartao, FaixaEmergencia, Opcao, SeloDemo, Tela, Texto } from '../componentes';
import { ROTAS_MODULOS } from '../navegacao/modulos';
import type { RotasRaiz } from '../navegacao/tipos';
import { useSessao } from '../sessao/SessaoContext';
import { useTema } from '../tema/TemaContext';
import { ESPACO, type PreferenciaTema, type TamanhoTexto } from '../tema/tokens';
import { AVISOS } from '../textos/avisos';

const TAMANHOS: { valor: TamanhoTexto; rotulo: string }[] = [
  { valor: 'normal', rotulo: 'Normal' },
  { valor: 'grande', rotulo: 'Grande' },
  { valor: 'extra_grande', rotulo: 'Extra grande' },
];

const TEMAS: { valor: PreferenciaTema; rotulo: string; descricao?: string }[] = [
  { valor: 'sistema', rotulo: 'Igual ao celular' },
  { valor: 'claro', rotulo: 'Claro' },
  { valor: 'escuro', rotulo: 'Escuro' },
  { valor: 'alto_contraste', rotulo: 'Alto contraste', descricao: 'Preto no branco, bordas fortes' },
];

export function Ajustes() {
  const navigation = useNavigation<NativeStackNavigationProp<RotasRaiz>>();
  const { usuario, cidade, sair } = useSessao();
  const { tamanho, definirTamanho, preferencia, definirPreferencia, cores } = useTema();
  // Telas de módulos sem aba própria aparecem aqui como atalho.
  const extras = ROTAS_MODULOS.filter((r) => !r.aba && r.titulo && !r.semAtalho);

  return (
    <Tela>
      <Cartao>
        <Texto variante="apoio">Você entrou como</Texto>
        <Texto variante="tituloCartao">{usuario?.nome_exibicao}</Texto>
        <SeloDemo />
      </Cartao>

      <Grupo titulo="Tamanho das letras">
        {TAMANHOS.map((t) => (
          <Opcao key={t.valor} rotulo={t.rotulo} selecionada={tamanho === t.valor} onPress={() => definirTamanho(t.valor)} />
        ))}
      </Grupo>

      <Grupo titulo="Cores da tela">
        {TEMAS.map((t) => (
          <Opcao
            key={t.valor}
            rotulo={t.rotulo}
            descricao={t.descricao}
            selecionada={preferencia === t.valor}
            onPress={() => definirPreferencia(t.valor)}
          />
        ))}
      </Grupo>

      <Grupo titulo="Cidade">
        <Texto>{cidade ?? 'Nenhuma cidade escolhida'}</Texto>
        <Botao rotulo="Trocar cidade" icone="place" variante="contorno" onPress={() => navigation.navigate('EscolhaCidade')} />
      </Grupo>

      {extras.length > 0 && (
        <Grupo titulo="Mais">
          {extras.map((r) => (
            <Botao key={r.nome} rotulo={r.titulo!} variante="contorno" onPress={() => navigation.navigate(r.nome)} />
          ))}
        </Grupo>
      )}

      <Grupo titulo="Sobre os dados">
        <Texto>
          {MODO_CONFIGURADO === 'mock'
            ? 'Modo demonstração (mock): os dados ficam no aparelho e somem ao fechar o app.'
            : `Conectado à API de demonstração: ${API_URL || '(sem endereço)'}. Partes ainda não prontas usam dados de demonstração, com aviso no topo.`}
        </Texto>
        <Texto variante="apoio" cor={cores.apagado}>
          Todos os dados são fictícios.
        </Texto>
      </Grupo>

      <Aviso tom="aviso">{AVISOS.limites}</Aviso>
      <FaixaEmergencia />
      <Botao rotulo="Sair" icone="logout" variante="perigo" onPress={sair} />
    </Tela>
  );
}

function Grupo({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: ESPACO[2] }}>
      <Texto variante="tituloCartao">{titulo}</Texto>
      {children}
    </View>
  );
}
