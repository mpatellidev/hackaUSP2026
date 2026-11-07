import { NavLink } from "react-router-dom";
import type { ItemMenu } from "@uhealth/ui";
import { Icone, type NomeIcone } from "./Icone";

const ICONES: Record<string, NomeIcone> = {
  "/": "clinica", "/clinicas": "local", "/pedidos": "pedido", "/agenda": "horario", "/assistente": "conversa",
};

/** Abas do rodapé com ícone SVG (32 px) e texto; usa o estilo `.tabbar` do design system. */
export function AbasPaciente({ itens }: { itens: ItemMenu[] }) {
  return (
    <nav className="tabbar" aria-label="Navegação principal">
      {itens.map((i) => (
        <NavLink key={i.caminho} to={i.caminho} end={i.fim}>
          <Icone nome={ICONES[i.caminho] ?? "ajuda"} tamanho={32} />
          <span>{i.rotulo}</span>
        </NavLink>
      ))}
    </nav>
  );
}
