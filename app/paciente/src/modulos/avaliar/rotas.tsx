import type { RotaModulo } from "../tipos";
import { Avaliar } from "./Avaliar";

export const rotas: RotaModulo[] = [{ caminho: "/pedidos/:id/avaliar", elemento: <Avaliar /> }];
