import type { RotaModulo } from "../tipos";
import { DetalhePedido } from "./DetalhePedido";
import { Historico } from "./Historico";
import { ListaPedidos } from "./ListaPedidos";

export const rotas: RotaModulo[] = [
  { caminho: "/pedidos", elemento: <ListaPedidos />, aba: { caminho: "/pedidos", rotulo: "Pedidos" } },
  { caminho: "/pedidos/:id", elemento: <DetalhePedido /> },
  { caminho: "/pedidos/:id/historico", elemento: <Historico /> },
];
