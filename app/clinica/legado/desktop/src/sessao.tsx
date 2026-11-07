import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { entrar as entrarApi, restaurar, sair as sairApi } from "./api/auth";
import { aoNaoAutenticado, MODO, temToken } from "./api/cliente";
import type { Usuario } from "./api/tipos";

interface Sessao {
  usuario: Usuario | null;
  /** false enquanto restaura a sessão de uma aba recarregada. */
  pronto: boolean;
  entrar(conta: string): Promise<void>;
  sair(): void;
}
const Ctx = createContext<Sessao | null>(null);

export function ProvedorSessao({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [pronto, setPronto] = useState(!(MODO === "api" && temToken()));
  useEffect(() => {
    if (pronto) return;
    let ativo = true;
    restaurar().then((u) => { if (ativo) { setUsuario(u); setPronto(true); } });
    return () => { ativo = false; };
  }, [pronto]);
  const sair = useCallback(() => { sairApi(); setUsuario(null); }, []);
  const entrar = useCallback(async (conta: string) => setUsuario(await entrarApi(conta)), []);
  useEffect(() => aoNaoAutenticado(sair), [sair]); // 401 do servidor volta para o login
  return <Ctx.Provider value={{ usuario, pronto, entrar, sair }}>{children}</Ctx.Provider>;
}

export function useSessao(): Sessao {
  const c = useContext(Ctx);
  if (!c) throw new Error("useSessao fora do ProvedorSessao");
  return c;
}
