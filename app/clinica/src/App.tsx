import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Carregando } from "@uhealth/ui";
import { ProvedorUHealth, TelaLogin, useSessao } from "@uhealth/api-client";
import { Casca } from "./Casca";
import { ROTAS } from "./rotas";

function Roteador() {
  const { usuario, restaurando } = useSessao();
  if (restaurando) return <Carregando texto="Entrando…" />;
  if (!usuario) return <TelaLogin papel="funcionario" titulo="Painel das clínicas" />;
  return (
    <Routes>
      <Route element={<Casca />}>
        {ROTAS.map((r) => <Route key={r.caminho} path={r.caminho} element={r.elemento} />)}
        <Route path="*" element={<Navigate to="/pedidos" replace />} />
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
