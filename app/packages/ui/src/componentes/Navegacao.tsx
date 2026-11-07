import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";

export interface ItemMenu {
  caminho: string;
  rotulo: string;
  icone?: string;
  fim?: boolean;
}

/** Barra de abas do celular (3 a 5 itens). */
export function Abas({ itens }: { itens: ItemMenu[] }) {
  return (
    <nav className="tabbar" aria-label="Navegação principal">
      {itens.map((i) => (
        <NavLink key={i.caminho} to={i.caminho} end={i.fim}>
          <span aria-hidden="true">{i.icone}</span>
          <span>{i.rotulo}</span>
        </NavLink>
      ))}
    </nav>
  );
}

/** Menu lateral da clínica (vira barra superior em telas estreitas). */
export function MenuLateral({ itens, topo }: { itens: ItemMenu[]; topo?: ReactNode }) {
  return (
    <nav className="menu-lateral" aria-label="Navegação principal">
      {topo}
      <ul>
        {itens.map((i) => (
          <li key={i.caminho}>
            <NavLink to={i.caminho} end={i.fim}>{i.icone && <span aria-hidden="true">{i.icone}</span>}{i.rotulo}</NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
