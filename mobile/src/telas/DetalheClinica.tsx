import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { View } from 'react-native';

import { apiClinicas } from '../api';
import {
  abrirDiscador,
  Aviso,
  Botao,
  Carregando,
  Chip,
  ErroComRetry,
  LinhaChips,
  Tela,
  Texto,
  useCarregar,
} from '../componentes';
import type { RotasRaiz } from '../navegacao/tipos';
import { ESPACO } from '../tema/tokens';
import { AVISOS } from '../textos/avisos';
import { ROTULO_CUSTO, rotuloEspecialidade, rotuloPublico } from '../textos/rotulos';
import { ChipsClinica } from './ListaClinicas';

export function DetalheClinica({ route, navigation }: NativeStackScreenProps<RotasRaiz, 'DetalheClinica'>) {
  const { clinicaId } = route.params;
  const { dados: c, erro, carregando, atualizando, atualizar, recarregar } = useCarregar(
    () => apiClinicas.obter(clinicaId),
    [clinicaId],
  );

  if (carregando) return <Carregando texto="Abrindo clínica…" />;
  if (erro || !c) return <ErroComRetry mensagem={erro ?? 'Clínica não encontrada.'} aoTentar={recarregar} />;

  return (
    <Tela aoAtualizar={atualizar} atualizando={atualizando}>
      <Texto variante="titulo">{c.nome}</Texto>
      <Texto variante="apoio">
        {c.cidade}, {c.uf}
      </Texto>
      <ChipsClinica clinica={c} />

      <Secao titulo="Atende">
        <Texto>{rotuloPublico(c.publico)}</Texto>
      </Secao>

      <Secao titulo="Áreas de atendimento">
        <LinhaChips>
          {c.especialidades.map((e) => (
            <Chip key={e} rotulo={rotuloEspecialidade(e)} />
          ))}
        </LinhaChips>
      </Secao>

      <Secao titulo="Custo">
        <Texto>{ROTULO_CUSTO[c.custo_informado]} (informado pela clínica)</Texto>
        <Aviso tom="aviso">{AVISOS.custo}</Aviso>
      </Secao>

      <Secao titulo="Telefone">
        <Texto>{c.telefone} (número fictício)</Texto>
        <Botao
          rotulo="Abrir discador"
          icone="call"
          variante="contorno"
          onPress={() => abrirDiscador(c.telefone)}
          dica={AVISOS.discador}
        />
        <Texto variante="apoio">{AVISOS.discador}</Texto>
      </Secao>

      {c.recebendo_pedidos ? (
        <Botao
          rotulo="Pedir atendimento"
          icone="send"
          onPress={() => navigation.navigate('ConfirmarPedido', { clinicaId: c.id })}
        />
      ) : (
        <Aviso tom="perigo" titulo="Fechada por ora">
          Esta clínica não está recebendo pedidos agora. Veja outras clínicas da sua cidade.
        </Aviso>
      )}
    </Tela>
  );
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: ESPACO[2] }}>
      <Texto variante="tituloCartao">{titulo}</Texto>
      {children}
    </View>
  );
}
