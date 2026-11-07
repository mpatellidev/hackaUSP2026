import type { RotaModulo } from "../../rotas";
import DetalheSolicitacao from "./DetalheSolicitacao";
import ListaSolicitacoes from "./ListaSolicitacoes";

export const rotas: RotaModulo[] = [
  { caminho: "/solicitacoes", rotulo: "Solicitações", componente: ListaSolicitacoes },
  { caminho: "/solicitacoes/:id", rotulo: "Pedido", componente: DetalheSolicitacao, oculta: true },
];
