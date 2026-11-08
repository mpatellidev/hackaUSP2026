import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Carregando } from "@uhealth/ui";
import { ProvedorUHealth, useSessao } from "@uhealth/api-client";
import { Casca } from "./Casca";
import { Entrar } from "./design/Entrar";
import { INICIO, ROTAS } from "./rotas";

function Roteador() {
  const { usuario, restaurando } = useSessao();
  if (restaurando) return <Carregando texto="Entrando…" />;
  if (!usuario) return <Entrar />;
  return (
    <Routes>
      {ROTAS.filter((r) => r.telaCheia).map((r) => <Route key={r.caminho} path={r.caminho} element={r.elemento} />)}
      <Route element={<Casca />}>
        {ROTAS.filter((r) => !r.telaCheia).map((r) => <Route key={r.caminho} path={r.caminho} element={r.elemento} />)}
        <Route path="*" element={<Navigate to={INICIO} replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <ProvedorUHealth app="clinica" papelEsperado="funcionario">
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <Roteador />
      </BrowserRouter>
    </ProvedorUHealth>
  );
}
