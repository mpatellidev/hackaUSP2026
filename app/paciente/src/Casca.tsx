import { Link, Outlet, useLocation } from "react-router-dom";
import { useSessao } from "@uhealth/api-client";
import { AbasPaciente } from "./design/AbasPaciente";
import { Icone } from "./design/Icone";
import { TROCAR_PARA, salvarModo } from "./modoAtendimento";
import { ABAS } from "./rotas";

/** Telas com a barra de abas (as demais são fluxos de tela cheia, como no design). */
const COM_ABAS = /^\/(clinicas|pedidos|cuidado|assistente)?$|^\/pedidos\/[^/]+$/;

/** Moldura do painel: botão sempre visível para trocar para a assistente, tela e abas. */
export function Casca() {
  const { pathname } = useLocation();
  const { api } = useSessao();
  return (
    <div className="d-casca">
      <div className="d-troca">
        <Link className="d-emergencia-btn" to="/emergencia"><Icone nome="alerta" tamanho={20} />Emergência</Link>
        <button type="button" className="d-troca-btn" onClick={() => salvarModo(api, "conversa")}>
          <Icone nome="conversa" tamanho={20} />{TROCAR_PARA.conversa}
        </button>
      </div>
      <Outlet />
      {COM_ABAS.test(pathname) && <AbasPaciente itens={ABAS} />}
    </div>
  );
}
