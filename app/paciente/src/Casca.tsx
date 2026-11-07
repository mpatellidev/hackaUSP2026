import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Abas, Botao, CartaoEmergencia, FaixaDemo, Preferencias } from "@uhealth/ui";
import { useSessao } from "@uhealth/api-client";
import { ABAS } from "./rotas";

/** Moldura do app logado: faixa de demonstração, preferências, emergência sempre acessível e abas. */
export function Casca() {
  const { sair } = useSessao();
  const [emergencia, setEmergencia] = useState(false);
  return (
    <div className="tela-celular">
      <FaixaDemo />
      <header className="cabecalho-app">
        <div className="linha-topo">
          <span className="marca">UHealth</span>
          <Preferencias />
        </div>
        <div className="linha">
          <Botao variante="sun" onClick={() => setEmergencia(true)}>Emergência: 192</Botao>
          <Botao variante="outline" onClick={() => void sair()}>Sair</Botao>
        </div>
      </header>
      <main className="conteudo" id="conteudo"><Outlet /></main>
      <Abas itens={ABAS} />
      <CartaoEmergencia aberto={emergencia} aoFechar={() => setEmergencia(false)} />
    </div>
  );
}
