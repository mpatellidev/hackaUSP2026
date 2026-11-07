import type { RotaModulo } from "../tipos";
import { Fila } from "./Fila";

export const rotas: RotaModulo[] = [{ caminho: "/fila", elemento: <Fila />, aba: { caminho: "/fila", rotulo: "Fila", icone: "≡" } }];
