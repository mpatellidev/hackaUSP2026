import type { RotaModulo } from "../tipos";
import { AgendarClinica } from "./AgendarClinica";
import { BuscaClinicas } from "./BuscaClinicas";

export const rotas: RotaModulo[] = [
  { caminho: "/clinicas", elemento: <BuscaClinicas />, aba: { caminho: "/clinicas", rotulo: "Clínicas" } },
  { caminho: "/clinicas/:id", elemento: <AgendarClinica /> },
];
