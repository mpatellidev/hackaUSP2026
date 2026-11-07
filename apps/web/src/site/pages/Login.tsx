import { useState, type FormEvent } from "react";
import { AuthError } from "../auth/authApi";
import { useAuth } from "../auth/useAuth";
import { chatLogoUrl as logo } from "../../chat";

export function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(email, senha);
    } catch (err) {
      setError(err instanceof AuthError ? err.message : "Não foi possível conectar. Verifique sua internet.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="login" id="conteudo">
      <form className="login-card" onSubmit={submit} aria-describedby={error ? "login-error" : undefined}>
        <img className="login-logo" src={logo} alt="" width={56} height={56} />
        <h1>Assistente de Agendamento</h1>
        <p className="login-sub">Entre para marcar seus atendimentos.</p>

        <label htmlFor="email">E-mail</label>
        <input
          id="email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={!!error}
        />

        <label htmlFor="senha">Senha</label>
        <div className="password-row">
          <input
            id="senha"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            aria-invalid={!!error}
          />
          <button
            type="button"
            className="login-eye"
            aria-pressed={showPassword}
            onClick={() => setShowPassword((v) => !v)}
          >
            <EyeIcon off={showPassword} />
            <span className="sr-only">Mostrar senha</span>
          </button>
        </div>

        <div aria-live="assertive">
          {error && (
            <p id="login-error" className="form-error">
              {error}
            </p>
          )}
        </div>

        <button type="submit" className="login-submit" disabled={busy}>
          {busy ? "Entrando…" : "Entrar"}
        </button>

        {import.meta.env.DEV && (
          <p className="login-hint">
            Ambiente de teste: <code>maria@exemplo.com</code> / <code>senha123</code>
          </p>
        )}
      </form>
    </main>
  );
}

function EyeIcon({ off }: { off?: boolean }) {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
      {off && <path d="M4 4l16 16" />}
    </svg>
  );
}
