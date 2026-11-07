import type { RotaModulo } from "../tipos";
import { Inicio } from "./Inicio";

export const rotas: RotaModulo[] = [{ caminho: "/", elemento: <Inicio />, aba: { caminho: "/", rotulo: "Início", icone: "⌂", fim: true } }];
