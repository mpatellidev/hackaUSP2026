import { NavLink } from "react-router-dom";
import type { ItemMenu } from "@uhealth/ui";
import { Icone, type NomeIcone } from "./Icone";

const ICONES: Record<string, NomeIcone> = { "/clinicas": "buscar", "/pedidos": "pedido", "/cuidado": "analise", "/assistente": "conversa" };

/** Abas do rodapé do design: Buscar · Meu pedido · Ajuda (ícone de 24 px com texto). */
export function AbasPaciente({ itens }: { itens: ItemMenu[] }) {
  return (
    <nav className="d-abas" aria-label="Principal">
      {itens.map((i) => (
        <NavLink key={i.caminho} to={i.caminho} end={i.caminho === "/pedidos" ? false : undefined}>
          <Icone nome={ICONES[i.caminho] ?? "ajuda"} />
          <span>{i.rotulo}</span>
        </NavLink>
      ))}
    </nav>
  );
}
