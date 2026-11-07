import type { RotaModulo } from "../tipos";
import { Alternativas } from "./Alternativas";

export const rotas: RotaModulo[] = [{ caminho: "/pedidos/:id/alternativas", elemento: <Alternativas /> }];
