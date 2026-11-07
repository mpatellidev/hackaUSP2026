import { useState, type FormEvent } from "react";
import { AuthError, CONTAS_DEMO } from "../auth/authApi";
import { useAuth } from "../auth/useAuth";
import { chatLogoUrl as logo } from "../../chat";

export function Login() {
  const { login } = useAuth();
  const [conta, setConta] = useState(CONTAS_DEMO[0].conta);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(conta);
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
        <h1>UHealth · Assistente</h1>
        <p className="login-sub">Encontre clínicas-escola de saúde e acompanhe seus pedidos.</p>
        <p className="demo-seal">Conta fictícia · demonstração</p>

        <label htmlFor="conta">Escolha uma conta de teste</label>
        <select
          id="conta"
          className="login-select"
          value={conta}
          onChange={(e) => setConta(e.target.value)}
          aria-invalid={!!error}
        >
          {CONTAS_DEMO.map((c) => (
            <option key={c.conta} value={c.conta}>
              {c.nome} ({c.conta})
            </option>
          ))}
        </select>

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

        <p className="login-hint">
          Login de demonstração, sem senha e sem segurança. Os dados são fictícios.
        </p>
      </form>
    </main>
  );
}
