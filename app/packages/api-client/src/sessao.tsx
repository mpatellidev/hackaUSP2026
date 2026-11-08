import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { criarApi, type Api } from "./cliente";
import { ErroApi } from "./erro";
import type { UsuarioSessao } from "./tipos";

type Papel = "paciente" | "funcionario";

interface ValorSessao {
  api: Api;
  usuario: UsuarioSessao | null;
  /** true enquanto restaura a sessão guardada no navegador */
  restaurando: boolean;
  entrar: (conta: string, senha: string | null) => Promise<void>;
  /** app do paciente: CPF ou e-mail, e senha */
  entrarComEmail: (login: string, senha: string) => Promise<void>;
  /** app do paciente: cria a conta (com CPF) e já entra */
  cadastrar: (nome: string, cpf: string, email: string, senha: string) => Promise<void>;
  sair: () => Promise<void>;
}

const Contexto = createContext<ValorSessao | null>(null);

export function useSessao(): ValorSessao {
  const v = useContext(Contexto);
  if (!v) throw new Error("useSessao fora do <ProvedorUHealth>");
  return v;
}

/** Usuário logado; só chamar dentro de telas que exigem login. */
export function useUsuario(): UsuarioSessao {
  const { usuario } = useSessao();
  if (!usuario) throw new Error("useUsuario sem sessão");
  return usuario;
}

function ler(chave: string): string | null {
  try { return sessionStorage.getItem(chave); } catch { return null; }
}
function gravar(chave: string, valor: string | null) {
  try { valor ? sessionStorage.setItem(chave, valor) : sessionStorage.removeItem(chave); } catch { /* sem armazenamento */ }
}

/**
 * Sessão + TanStack Query. O token fica em sessionStorage (some ao fechar a aba); o papel e a clínica vêm de /auth/me
 * (do servidor). `papelEsperado` impede abrir o app da clínica com conta de paciente e vice-versa.
 */
export function ProvedorUHealth({ app, papelEsperado, children }: { app: "paciente" | "clinica"; papelEsperado: Papel; children: ReactNode }) {
  const chave = `uhealth.sessao.${app}`;
  const token = useRef<string | null>(ler(chave));
  const [usuario, setUsuario] = useState<UsuarioSessao | null>(null);
  const [restaurando, setRestaurando] = useState(token.current !== null);
  const [qc] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } } }));

  const limpar = useCallback(() => {
    token.current = null;
    gravar(chave, null);
    setUsuario(null);
    qc.clear();
  }, [chave, qc]);

  const api = useMemo(() => criarApi({ obterToken: () => token.current, aoNaoAutenticado: limpar }), [limpar]);

  const carregarUsuario = useCallback(async () => {
    const me = await api.dados(api.cliente.GET("/auth/me", {}));
    if (me.usuario.papel !== papelEsperado) {
      await api.semCorpo(api.cliente.POST("/auth/logout", {})).catch(() => undefined);
      limpar();
      throw new ErroApi(403, "papel_errado", papelEsperado === "paciente"
        ? "Esta conta é de uma clínica. Use o painel das clínicas."
        : "Esta conta é de paciente. Use o app do paciente.");
    }
    setUsuario(me.usuario);
  }, [api, limpar, papelEsperado]);

  useEffect(() => {
    if (token.current === null) return;
    carregarUsuario().catch(() => undefined).finally(() => setRestaurando(false));
  }, [carregarUsuario]);

  const entrar = useCallback(async (conta: string, senha: string | null) => {
    const r = senha === null
      ? await api.dados(api.cliente.POST("/auth/demo/login", { body: { conta } }))
      : await api.dados(api.cliente.POST("/auth/login", { body: { conta, senha } }));
    token.current = r.token;
    gravar(chave, r.token);
    await carregarUsuario();
  }, [api, carregarUsuario, chave]);

  const guardarToken = useCallback(async (novo: string) => {
    token.current = novo;
    gravar(chave, novo);
    await carregarUsuario();
  }, [carregarUsuario, chave]);

  const entrarComEmail = useCallback(async (login: string, senha: string) => {
    const r = await api.dados(api.cliente.POST("/auth/entrar", { body: { login, senha } }));
    await guardarToken(r.token);
  }, [api, guardarToken]);

  const cadastrar = useCallback(async (nome: string, cpf: string, email: string, senha: string) => {
    const r = await api.dados(api.cliente.POST("/auth/cadastro", { body: { nome, cpf, email, senha } }));
    await guardarToken(r.token);
  }, [api, guardarToken]);

  const sair = useCallback(async () => {
    await api.semCorpo(api.cliente.POST("/auth/logout", {})).catch(() => undefined);
    limpar();
  }, [api, limpar]);

  const valor = useMemo(() => ({ api, usuario, restaurando, entrar, entrarComEmail, cadastrar, sair }),
    [api, usuario, restaurando, entrar, entrarComEmail, cadastrar, sair]);
  return (
    <QueryClientProvider client={qc}>
      <Contexto.Provider value={valor}>{children}</Contexto.Provider>
    </QueryClientProvider>
  );
}
