import { useState, type FormEvent } from "react";
import { contasFuncionario } from "../api/auth";
import { ApiErro } from "../api/cliente";
import { Erro } from "../componentes/Estados";
import { useSessao } from "../sessao";

export function Login() {
  const { entrar } = useSessao();
  const contas = contasFuncionario();
  const [conta, setConta] = useState(contas[0]?.conta ?? "");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setErro(null); setEnviando(true);
    try { await entrar(conta); }
    catch (x) { setErro(x instanceof ApiErro ? x.message : "Algo deu errado. Tente de novo."); }
    finally { setEnviando(false); }
  }

  return (
    <main className="login">
      <form className="card" onSubmit={enviar} aria-labelledby="titulo-login">
        <h1 id="titulo-login">UHealth · Painel da clínica</h1>
        <div className="selo-demo" role="note"><strong>Login de demonstração, sem senha.</strong> Contas e dados fictícios. Não é seguro para uso real.</div>
        <label className="field">
          <span>Conta de funcionário</span>
          <select value={conta} onChange={(e) => setConta(e.target.value)}>
            {contas.map((c) => (
              <option key={c.conta} value={c.conta}>{c.nome} · {c.funcao} · {c.clinica_nome}</option>
            ))}
          </select>
        </label>
        {erro && <Erro mensagem={erro} />}
        <button type="submit" className="btn btn--primary" disabled={enviando}>{enviando ? "Entrando…" : "Entrar"}</button>
      </form>
    </main>
  );
}
