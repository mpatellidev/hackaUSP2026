import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { AuthError, authApi, tokenStore, type User } from "./authApi";

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (conta: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

/** Login DEMO do backend (conta fictícia, sem senha). O chat só recebe o token. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    if (tokenStore.get()) authApi.logout().catch(() => undefined);
    tokenStore.set(null);
    setUser(null);
  }, []);

  useEffect(() => {
    if (!tokenStore.get()) {
      setLoading(false);
      return;
    }
    authApi
      .me()
      .then(setUser)
      .catch(() => tokenStore.set(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (conta: string) => {
    const { token } = await authApi.login(conta);
    tokenStore.set(token);
    const me = await authApi.me(); // papel vem do servidor, não da resposta do login
    if (me.papel !== "paciente") {
      tokenStore.set(null);
      throw new AuthError(403, "O assistente é para pacientes. Entre com uma conta de paciente.");
    }
    setUser(me);
  }, []);

  const value = useMemo(() => ({ user, loading, login, logout }), [user, loading, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth precisa estar dentro de <AuthProvider>");
  return ctx;
}
