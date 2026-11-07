import type { RotaModulo } from "../tipos";
import { Urgencias } from "./Urgencias";

export const rotas: RotaModulo[] = [{ caminho: "/urgencias", elemento: <Urgencias />, aba: { caminho: "/urgencias", rotulo: "Urgências", icone: "!" } }];
