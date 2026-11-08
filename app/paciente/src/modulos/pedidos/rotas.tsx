import type { RotaModulo } from "../tipos";
import { DetalhePedido } from "./DetalhePedido";
import { ListaPedidos } from "./ListaPedidos";

export const rotas: RotaModulo[] = [
  { caminho: "/pedidos", elemento: <ListaPedidos />, aba: { caminho: "/pedidos", rotulo: "Meu pedido" } },
  { caminho: "/pedidos/:id", elemento: <DetalhePedido /> },
];
