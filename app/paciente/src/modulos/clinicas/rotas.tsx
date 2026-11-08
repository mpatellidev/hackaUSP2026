import type { RotaModulo } from "../tipos";
import { BuscaClinicas } from "./BuscaClinicas";
import { PedirAtendimento } from "./PedirAtendimento";

export const rotas: RotaModulo[] = [
  { caminho: "/clinicas", elemento: <BuscaClinicas />, aba: { caminho: "/clinicas", rotulo: "Buscar" } },
  { caminho: "/clinicas/:id", elemento: <PedirAtendimento /> },
];
