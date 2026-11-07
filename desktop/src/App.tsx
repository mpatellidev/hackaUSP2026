import { HashRouter, NavLink, Navigate, Route, Routes } from "react-router-dom";
import { MODO } from "./api/cliente";
import { Preferencias } from "./componentes/Preferencias";
import { SeloDemo } from "./componentes/Estados";
import { ROTAS } from "./rotas";
import { ProvedorSessao, useSessao } from "./sessao";
import { Login } from "./telas/Login";

function Painel() {
  const { usuario, sair } = useSessao();
  if (!usuario) return <Login />;
  return (
    <HashRouter>
      <a className="pular" href="#conteudo">Pular para o conteúdo</a>
      <div className="shell">
        <nav className="side" aria-label="Principal">
          <span className="brand">UHealth</span>
          {ROTAS.filter((r) => !r.oculta).map((r) => <NavLink key={r.caminho} to={r.caminho}>{r.rotulo}</NavLink>)}
          <div className="side-rodape">
            <span>{usuario.nome_exibicao}<br /><small>{usuario.funcao}</small></span>
            <Preferencias />
            <button type="button" className="btn btn--outline" onClick={sair}>Sair</button>
          </div>
        </nav>
        <main id="conteudo" className="content" tabIndex={-1}>
          <SeloDemo modo={MODO} />
          <Routes>
            {ROTAS.map((r) => <Route key={r.caminho} path={r.caminho} element={<r.componente />} />)}
            <Route path="*" element={<Navigate to="/solicitacoes" replace />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  );
}

export default function App() {
  return <ProvedorSessao><Painel /></ProvedorSessao>;
}
