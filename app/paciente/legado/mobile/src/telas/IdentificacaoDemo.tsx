import { useState } from 'react';
import { View } from 'react-native';

import { mensagemDeErro } from '../api';
import contasJson from '../api/mock/fixtures/contas-demo.json';
import usuariosJson from '../api/mock/fixtures/usuarios.json';
import { Aviso, Cartao, Tela, Texto } from '../componentes';
import { useSessao } from '../sessao/SessaoContext';
import { useTema } from '../tema/TemaContext';
import { ESPACO } from '../tema/tokens';
import { AVISOS } from '../textos/avisos';

// Lista só para escolher uma conta da demonstração. Quem decide o papel é o servidor, no login.
const CONTAS = contasJson.itens
  .filter((c) => c.conta.startsWith('paciente.'))
  .map((c) => ({
    conta: c.conta,
    nome: usuariosJson.itens.find((u) => u.id === c.usuario_id)?.nome_exibicao ?? c.conta,
  }));

export function IdentificacaoDemo() {
  const { entrar } = useSessao();
  const { cores } = useTema();
  const [entrando, setEntrando] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function escolher(conta: string) {
    setEntrando(conta);
    setErro(null);
    try {
      await entrar(conta);
    } catch (e) {
      setErro(mensagemDeErro(e));
      setEntrando(null);
    }
  }

  return (
    <Tela>
      <Texto variante="titulo">Quem é você?</Texto>
      <Aviso tom="aviso" titulo="Demonstração">
        {AVISOS.loginDemo}
      </Aviso>
      <Texto>Escolha uma pessoa fictícia para entrar:</Texto>

      {erro && <Aviso tom="perigo">{erro}</Aviso>}

      <View style={{ gap: ESPACO[3] }}>
        {CONTAS.map((c) => (
          <Cartao
            key={c.conta}
            onPress={() => !entrando && escolher(c.conta)}
            rotuloAcessivel={`Entrar como ${c.nome}, conta fictícia`}
          >
            <Texto variante="tituloCartao">{c.nome}</Texto>
            <Texto variante="apoio">
              {entrando === c.conta ? 'Entrando…' : `Conta fictícia: ${c.conta}`}
            </Texto>
          </Cartao>
        ))}
      </View>
      <Texto variante="apoio" cor={cores.apagado}>
        Não há senha. Ninguém real está por trás dessas contas.
      </Texto>
    </Tela>
  );
}
