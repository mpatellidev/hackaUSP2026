import { useState, type FormEvent } from "react";
import { mensagemDe, useSessao } from "@uhealth/api-client";
import { cpfValido, formatarCpf, pareceCpf } from "./cpf";
import { Icone, Simbolo } from "./Icone";
import "./clinica.css";

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Entrar com CPF ou e-mail e senha (POST /auth/entrar), igual ao app do paciente. O papel vem do servidor:
 *  conta de paciente é recusada aqui. Contas da equipe não são criadas pelo app. */
export function Entrar() {
  const { entrarComEmail } = useSessao();
  const [login, setLogin] = useState("");
  const [senha, setSenha] = useState("");
  const [verSenha, setVerSenha] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const problema = (): string | null => {
    if (!(EMAIL.test(login.trim()) || cpfValido(login))) return "Digite seu CPF (11 números) ou seu e-mail.";
    if (!senha) return "Digite sua senha.";
    return null;
  };

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    const p = problema();
    if (p) { setErro(p); return; }
    setErro(null);
    setEnviando(true);
    try {
      await entrarComEmail(login.trim(), senha);
    } catch (err) {
      setErro(mensagemDe(err));
      setEnviando(false);
    }
  };

  return (
    <div className="d-admin d-entrar">
      <form className="d-panel d-form-panel d-entrar-cartao" onSubmit={enviar} noValidate>
        <div className="d-brand d-entrar-marca"><Simbolo />UHealth</div>
        <span className="d-eyebrow">Portal da clínica · ambiente de demonstração</span>
        <h1 style={{ marginTop: 8 }}>Entrar</h1>
        <p className="d-muted" style={{ fontSize: 13, marginTop: 5 }}>Use seu CPF ou e-mail e a sua senha.</p>
        <div className="d-form-grid">
          <label className="d-field d-full">CPF ou e-mail
            <input value={login} autoComplete="username" maxLength={160} inputMode={pareceCpf(login) ? "numeric" : "email"}
              onChange={(e) => setLogin(pareceCpf(e.target.value) ? formatarCpf(e.target.value) : e.target.value)} />
          </label>
          <label className="d-field d-full">Senha
            <input type={verSenha ? "text" : "password"} value={senha} maxLength={120} autoComplete="current-password" onChange={(e) => setSenha(e.target.value)} />
          </label>
        </div>
        <label className="d-checkbox"><input type="checkbox" checked={verSenha} onChange={(e) => setVerSenha(e.target.checked)} />Mostrar senha</label>
        {erro && <div className="d-entrar-erro" role="alert"><Icone nome="ajuda" /><b>{erro}</b></div>}
        <button type="submit" className="d-button d-primary d-entrar-botao" disabled={enviando}>{enviando ? "Aguarde…" : "Entrar"}</button>
        <p className="d-profile-footer">Contas da equipe são criadas pela clínica. Dados fictícios de demonstração.</p>
        <p className="d-profile-footer">Emergência? <a href="tel:192">Ligue 192 (SAMU).</a></p>
      </form>
    </div>
  );
}
