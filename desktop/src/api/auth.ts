import { ApiErro, http, MODO, setToken } from "./cliente";
import { CONTAS, usuarioDe, type ContaDemo } from "./mock/dados";
import { definirSessaoAtual } from "./sessaoAtual";
import type { Usuario } from "./tipos";

/** Contas fictícias de funcionário (lista pública de demonstração). */
export const contasFuncionario = (): ContaDemo[] => CONTAS.filter((c) => c.papel === "funcionario");

export async function entrar(conta: string): Promise<Usuario> {
  let usuario: Usuario | null;
  if (MODO === "api") {
    const r = await http<{ token: string; usuario: Usuario }>("POST", "/auth/demo/login", { conta });
    setToken(r.token);
    usuario = (await http<{ usuario: Usuario }>("GET", "/auth/me")).usuario; // papel e clínica vêm do servidor
  } else {
    usuario = usuarioDe(conta);
    if (!usuario) throw new ApiErro(401, "nao_autenticado", "Conta não encontrada. Use uma conta fictícia de demonstração.");
  }
  if (usuario.papel !== "funcionario") {
    setToken(null);
    throw new ApiErro(403, "acesso_negado", "Este painel é só para funcionários de clínica.");
  }
  definirSessaoAtual(usuario);
  return usuario;
}

export function sair() {
  setToken(null);
  definirSessaoAtual(null);
}
