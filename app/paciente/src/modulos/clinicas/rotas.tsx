import type { RotaModulo } from "../tipos";
import { BuscaClinicas } from "./BuscaClinicas";
import { DetalheClinica } from "./DetalheClinica";

export const rotas: RotaModulo[] = [
  { caminho: "/clinicas", elemento: <BuscaClinicas />, aba: { caminho: "/clinicas", rotulo: "Clínicas", icone: "⚕" } },
  { caminho: "/clinicas/:id", elemento: <DetalheClinica /> },
];
