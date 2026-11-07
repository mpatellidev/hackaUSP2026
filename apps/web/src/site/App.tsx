// O "site": hoje só um login provisório que hospeda o chat.
// No sistema real, troque esta pasta pelo site de vocês e use o chat do mesmo jeito.
import { ChatApp } from "../chat";
import { tokenStore } from "./auth/authApi";
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
      user={{ nome: user.nome, foto_url: user.foto_url }}
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
