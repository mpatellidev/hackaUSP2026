import { useQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Aviso, Botao, Campo, CampoSelecao, Carregando, Erro, FaixaDemo } from "@uhealth/ui";
import { mensagemDe } from "./erro";
import { useSessao } from "./sessao";
import { FUNCAO } from "./rotulos";

/** Tela de login DEMO compartilhada: conta fictícia + senha de demonstração (ou sem senha, se o servidor permitir). */
export function TelaLogin({ papel, titulo }: { papel: "paciente" | "funcionario"; titulo: string }) {
  const { api, entrar } = useSessao();
  const contas = useQuery({ queryKey: ["auth", "contas"], queryFn: () => api.dados(api.cliente.GET("/auth/contas", {})) });
  const [conta, setConta] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const lista = (contas.data?.itens ?? []).filter((c) => c.papel === papel);
  const escolhida = conta || lista[0]?.conta || "";

  async function enviar(e: FormEvent, semSenha = false) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      await entrar(escolhida, semSenha ? null : senha);
    } catch (x) {
      setErro(mensagemDe(x));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="tela-celular">
      <FaixaDemo />
      <main className="conteudo">
        <h1>{titulo}</h1>
        <Aviso>Conta fictícia, só para demonstração. Não use dados reais.</Aviso>
        {contas.isPending && <Carregando />}
        {contas.isError && <Erro mensagem={mensagemDe(contas.error)} aoTentar={() => contas.refetch()} />}
        {contas.data && (
          <form className="pilha" onSubmit={enviar}>
            <CampoSelecao rotulo="Conta de demonstração" value={escolhida} onChange={(e) => setConta(e.target.value)}>
              {lista.map((c) => (
                <option key={c.conta} value={c.conta}>
                  {c.nome_exibicao}{c.funcao ? ` · ${FUNCAO[c.funcao] ?? c.funcao}` : ""}{c.clinica_nome ? ` · ${c.clinica_nome}` : ""}
                </option>
              ))}
            </CampoSelecao>
            <Campo rotulo="Senha de demonstração" type="password" autoComplete="off" value={senha}
              onChange={(e) => setSenha(e.target.value)}
              dica={contas.data.senha_demo ? `Senha de demonstração: ${contas.data.senha_demo}` : "Peça a senha à equipe da demonstração."} />
            {erro && <Aviso tom="perigo">{erro}</Aviso>}
            <Botao type="submit" bloco disabled={enviando || !escolhida || !senha}>{enviando ? "Entrando…" : "Entrar"}</Botao>
            {contas.data.login_sem_senha && (
              <Botao variante="outline" bloco disabled={enviando || !escolhida} onClick={(e) => enviar(e, true)}>
                Entrar sem senha (modo demonstração)
              </Botao>
            )}
          </form>
        )}
      </main>
    </div>
  );
}
