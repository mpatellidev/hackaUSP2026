import { Outlet, useLocation } from "react-router-dom";
import { AbasPaciente } from "./design/AbasPaciente";
import { useTopoAoMudar } from "./design/rolagem";
import { ABAS } from "./rotas";

/** Telas com a barra de abas (as demais são fluxos de tela cheia, como no design). */
const COM_ABAS = /^\/(clinicas|pedidos|cuidado|perfil|assistente)?$|^\/pedidos\/[^/]+$/;

/** Moldura do painel: tela e abas. Emergência e "Usar a assistente" ficam na página inicial (BuscaClinicas). */
export function Casca() {
  const { pathname } = useLocation();
  useTopoAoMudar(pathname);
  return (
    <div className="d-casca">
      <div className="d-conteudo"><Outlet /></div>
      {COM_ABAS.test(pathname) && <AbasPaciente itens={ABAS} />}
    </div>
  );
}
