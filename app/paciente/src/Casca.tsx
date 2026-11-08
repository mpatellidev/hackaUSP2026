import { Outlet, useLocation } from "react-router-dom";
import { FaixaDemo } from "@uhealth/ui";
import { AbasPaciente } from "./design/AbasPaciente";
import { ABAS } from "./rotas";

/** Telas com a barra de abas (as demais são fluxos de tela cheia, como no design). */
const COM_ABAS = /^\/(clinicas|pedidos|assistente)?$|^\/pedidos\/[^/]+$/;

/** Moldura do app logado: rótulo de demonstração, tela e abas. */
export function Casca() {
  const { pathname } = useLocation();
  return (
    <div className="d-casca">
      <FaixaDemo />
      <Outlet />
      {COM_ABAS.test(pathname) && <AbasPaciente itens={ABAS} />}
    </div>
  );
}
