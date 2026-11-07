import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { apiAuth, chamar, definirToken, ErroApi, type Usuario } from '../api';
import { mockDefinirUsuario } from '../api/mock/servidor';

const CHAVE_SESSAO = 'uhealth.sessao';
const CHAVE_CIDADE = 'uhealth.cidade';

interface ValorSessao {
  pronto: boolean;
  usuario: Usuario | null;
  cidade: string | null;
  entrar: (conta: string) => Promise<void>;
  sair: () => Promise<void>;
  escolherCidade: (cidade: string) => void;
}

const Contexto = createContext<ValorSessao | null>(null);

function aplicar(token: string | null, usuario: Usuario | null) {
  definirToken(token);
  mockDefinirUsuario(usuario?.id ?? null);
}

export function SessaoProvider({ children }: { children: ReactNode }) {
  const [pronto, setPronto] = useState(false);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cidade, setCidade] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [s, c] = await Promise.all([AsyncStorage.getItem(CHAVE_SESSAO), AsyncStorage.getItem(CHAVE_CIDADE)]);
        if (c) setCidade(c);
        if (s) {
          const salvo = JSON.parse(s) as { token: string; usuario: Usuario };
          aplicar(salvo.token, salvo.usuario);
          // Confere o token no servidor; papel e id valem o que o servidor disser.
          const me = await chamar<{ usuario: Usuario }>('/auth/me', { mock: () => ({ usuario: salvo.usuario }) });
          aplicar(salvo.token, me.usuario);
          setUsuario(me.usuario);
        }
      } catch (e) {
        if (e instanceof ErroApi && e.status === 401) {
          aplicar(null, null);
          await AsyncStorage.removeItem(CHAVE_SESSAO).catch(() => {});
        }
      } finally {
        setPronto(true);
      }
    })();
  }, []);

  const entrar = useCallback(async (conta: string) => {
    const r = await apiAuth.login(conta);
    if (r.usuario.papel !== 'paciente') {
      aplicar(r.token, r.usuario);
      await apiAuth.logout().catch(() => {});
      aplicar(null, null);
      throw new ErroApi(403, 'acesso_negado', 'Este app é para pacientes. Funcionários usam o app da clínica.');
    }
    aplicar(r.token, r.usuario);
    setUsuario(r.usuario);
    await AsyncStorage.setItem(CHAVE_SESSAO, JSON.stringify({ token: r.token, usuario: r.usuario })).catch(() => {});
  }, []);

  const sair = useCallback(async () => {
    await apiAuth.logout().catch(() => {});
    aplicar(null, null);
    setUsuario(null);
    await AsyncStorage.removeItem(CHAVE_SESSAO).catch(() => {});
  }, []);

  const escolherCidade = useCallback((c: string) => {
    setCidade(c);
    AsyncStorage.setItem(CHAVE_CIDADE, c).catch(() => {});
  }, []);

  const valor = useMemo(
    () => ({ pronto, usuario, cidade, entrar, sair, escolherCidade }),
    [pronto, usuario, cidade, entrar, sair, escolherCidade],
  );
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useSessao() {
  const v = useContext(Contexto);
  if (!v) throw new Error('useSessao precisa estar dentro de <SessaoProvider>');
  return v;
}
