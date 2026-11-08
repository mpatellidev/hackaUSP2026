import { useState, type FormEvent } from "react";
import { mensagemDe, useSessao } from "@uhealth/api-client";
import { Btn } from "../../design/Componentes";
import { Icone, Simbolo } from "../../design/Icone";
import { cpfValido, formatarCpf, pareceCpf } from "../../cpf";
import { Marca } from "@uhealth/ui";

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Entrar com CPF ou e-mail e senha, ou criar conta com CPF (POST /auth/entrar e /auth/cadastro). */
export function Entrar() {
  const { entrarComEmail, cadastrar } = useSessao();
  const [modo, setModo] = useState<"entrar" | "cadastro">("entrar");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [login, setLogin] = useState("");
  const [cpf, setCpf] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [verSenha, setVerSenha] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const cadastro = modo === "cadastro";

  const problema = (): string | null => {
    if (cadastro && nome.trim().length < 2) return "Digite seu nome.";
    if (cadastro && !cpfValido(cpf)) return "CPF inválido. Confira os 11 números.";
    if (cadastro && !EMAIL.test(email.trim())) return "Digite um e-mail válido, como nome@email.com.";
    if (!cadastro && !(EMAIL.test(login.trim()) || cpfValido(login))) return "Digite seu CPF (11 números) ou seu e-mail.";
    if (!senha) return "Digite sua senha.";
    if (cadastro && senha.length < 8) return "A senha precisa ter pelo menos 8 caracteres.";
    if (cadastro && senha !== confirmar) return "As senhas não são iguais.";
    return null;
  };

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    const p = problema();
    if (p) { setErro(p); return; }
    setErro(null);
    setEnviando(true);
    try {
      if (cadastro) await cadastrar(nome.trim(), cpf, email.trim(), senha);
      else await entrarComEmail(login.trim(), senha);
    } catch (err) {
      setErro(mensagemDe(err));
      setEnviando(false);
    }
  };

  const trocar = (m: "entrar" | "cadastro") => { setModo(m); setErro(null); setSenha(""); setConfirmar(""); };

  return (
    <div className="d-casca">
      <div className="d-tela">
        <form className="d-corpo d-corpo--24" onSubmit={enviar} noValidate>
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--uh-link)" }}>
            <Simbolo tamanho={34} /><Marca className="d-marca d-marca--24" />
          </div>
          <h1 className="d-h1 d-h1--30">{cadastro ? "Criar sua conta" : "Entrar"}</h1>
          <p className="d-p">{cadastro ? "Leva menos de um minuto. Seus dados ficam protegidos." : "Use seu CPF ou e-mail e a sua senha."}</p>

          {cadastro && (
            <div className="d-campo">
              <label htmlFor="entrar-nome">Nome completo</label>
              <input id="entrar-nome" value={nome} autoComplete="name" maxLength={120} onChange={(e) => setNome(e.target.value)} />
            </div>
          )}
          {cadastro ? (
            <>
              <div className="d-campo">
                <label htmlFor="entrar-cpf">CPF</label>
                <input id="entrar-cpf" inputMode="numeric" placeholder="000.000.000-00" value={cpf} maxLength={14}
                  onChange={(e) => setCpf(formatarCpf(e.target.value))} />
              </div>
              <div className="d-campo">
                <label htmlFor="entrar-email">E-mail</label>
                <input id="entrar-email" type="email" inputMode="email" value={email} autoComplete="email" maxLength={160} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </>
          ) : (
            <div className="d-campo">
              <label htmlFor="entrar-login">CPF ou e-mail</label>
              <input id="entrar-login" value={login} autoComplete="username" maxLength={160}
                inputMode={pareceCpf(login) ? "numeric" : "email"}
                onChange={(e) => setLogin(pareceCpf(e.target.value) ? formatarCpf(e.target.value) : e.target.value)} />
            </div>
          )}
          <div className="d-campo">
            <label htmlFor="entrar-senha">Senha</label>
            <input id="entrar-senha" type={verSenha ? "text" : "password"} value={senha} maxLength={120}
              autoComplete={cadastro ? "new-password" : "current-password"} aria-describedby={cadastro ? "entrar-senha-ajuda" : undefined}
              onChange={(e) => setSenha(e.target.value)} />
            {cadastro && <p id="entrar-senha-ajuda" className="d-small">Pelo menos 8 caracteres.</p>}
          </div>
          {cadastro && (
            <div className="d-campo">
              <label htmlFor="entrar-confirmar">Repita a senha</label>
              <input id="entrar-confirmar" type={verSenha ? "text" : "password"} value={confirmar} autoComplete="new-password" maxLength={120} onChange={(e) => setConfirmar(e.target.value)} />
            </div>
          )}
          <label className="d-op d-op--m" style={{ minHeight: 44 }}>
            <input type="checkbox" checked={verSenha} onChange={(e) => setVerSenha(e.target.checked)} />
            Mostrar senha
          </label>

          {erro && <div className="d-aviso d-aviso--perigo" role="alert"><Icone nome="alerta" tamanho={24} /><b>{erro}</b></div>}

          <div className="d-fim">
            <Btn type="submit" disabled={enviando}>{enviando ? "Aguarde…" : cadastro ? "Criar conta" : "Entrar"}</Btn>
            {cadastro
              ? <Btn variante="link" onClick={() => trocar("entrar")}>Já tenho conta</Btn>
              : <Btn variante="link" onClick={() => trocar("cadastro")}>Criar conta</Btn>}
            <p className="d-samu">Emergência? <a href="tel:192">Ligue 192 (SAMU).</a></p>
          </div>
        </form>
      </div>
    </div>
  );
}
