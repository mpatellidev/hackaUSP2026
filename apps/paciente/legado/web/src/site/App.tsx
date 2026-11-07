// O "site": login DEMO (conta fictícia) que hospeda o chat. O chat só recebe o token.
import { ChatApp } from "../chat";
import { API_URL, tokenStore } from "./auth/authApi";
import { AuthProvider, useAuth } from "./auth/useAuth";
import { Login } from "./pages/Login";
import "./styles/site.css";

function Routes() {
  const { user, loading, logout } = useAuth();
  if (loading)
    return (
      <p className="site-loading" role="status">
        Carregando…
      </p>
    );
  if (!user) return <Login />;
  return (
    <ChatApp
      key={user.id}
      user={{ nome: user.nome_exibicao }}
      apiUrl={API_URL}
      getToken={tokenStore.get}
      onUnauthorized={logout}
      onLogout={logout}
    />
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Routes />
    </AuthProvider>
  );
}
