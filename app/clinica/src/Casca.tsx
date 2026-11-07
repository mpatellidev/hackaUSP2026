import { Outlet } from "react-router-dom";
import { Botao, FaixaDemo, MenuLateral, Preferencias } from "@uhealth/ui";
import { FUNCAO, useSessao, useUsuario } from "@uhealth/api-client";
import { MENU } from "./rotas";

/** Moldura do painel das clínicas: menu lateral (barra superior em telas estreitas). */
export function Casca() {
  const { sair } = useSessao();
  const u = useUsuario();
  return (
    <>
      <FaixaDemo />
      <div className="shell-clinica">
        <MenuLateral itens={MENU} topo={(
          <div className="pilha">
            <span className="marca">UHealth · Clínica</span>
            <span>{u.nome_exibicao}{u.funcao ? ` · ${FUNCAO[u.funcao]}` : ""}</span>
            <Preferencias />
            <Botao variante="outline" onClick={() => void sair()}>Sair</Botao>
          </div>
        )} />
        <main id="conteudo"><Outlet /></main>
      </div>
    </>
  );
}
