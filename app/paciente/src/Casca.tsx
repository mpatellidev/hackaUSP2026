import { Outlet, useLocation } from "react-router-dom";
import { AbasPaciente } from "./design/AbasPaciente";
import { ABAS } from "./rotas";

/** Telas com a barra de abas (as demais são fluxos de tela cheia, como no design). */
const COM_ABAS = /^\/(clinicas|pedidos|cuidado|perfil|assistente)?$|^\/pedidos\/[^/]+$/;

/** Moldura do painel: tela e abas. Emergência e "Usar a assistente" ficam na página inicial (BuscaClinicas). */
export function Casca() {
  const { pathname } = useLocation();
  return (
    <div className="d-casca">
      <Outlet />
      {COM_ABAS.test(pathname) && <AbasPaciente itens={ABAS} />}
    </div>
  );
}
