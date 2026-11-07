import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Botao, CartaoEmergencia, FaixaDemo } from "@uhealth/ui";
import { useSessao } from "@uhealth/api-client";
import { AbasPaciente } from "./design/AbasPaciente";
import { Simbolo } from "./design/Icone";
import { PreferenciasPaciente } from "./design/Preferencias";
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
          <span className="marca"><Simbolo />UHealth</span>
          <PreferenciasPaciente />
        </div>
        <div className="linha">
          <Botao variante="sun" onClick={() => setEmergencia(true)}>Emergência: 192</Botao>
          <Botao variante="outline" onClick={() => void sair()}>Sair</Botao>
        </div>
      </header>
      <main className="conteudo" id="conteudo"><Outlet /></main>
      <AbasPaciente itens={ABAS} />
      <CartaoEmergencia aberto={emergencia} aoFechar={() => setEmergencia(false)} />
    </div>
  );
}
