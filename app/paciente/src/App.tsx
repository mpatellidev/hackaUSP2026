import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Carregando } from "@uhealth/ui";
import { ProvedorUHealth, TelaLogin, useSessao } from "@uhealth/api-client";
import { useState } from "react";
import { Casca } from "./Casca";
import { BoasVindas, boasVindasConcluida } from "./modulos/boasvindas/BoasVindas";
import { ROTAS } from "./rotas";

function Roteador() {
  const { usuario, restaurando } = useSessao();
  const [vistas, setVistas] = useState(boasVindasConcluida);
  if (restaurando) return <Carregando texto="Entrando…" />;
  if (!vistas) return <BoasVindas aoConcluir={() => setVistas(true)} />;
  if (!usuario) return <TelaLogin papel="paciente" titulo="Entrar no UHealth" />;
  return (
    <Routes>
      <Route element={<Casca />}>
        {ROTAS.map((r) => <Route key={r.caminho} path={r.caminho} element={r.elemento} />)}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <ProvedorUHealth app="paciente" papelEsperado="paciente">
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <Roteador />
      </BrowserRouter>
    </ProvedorUHealth>
  );
}
