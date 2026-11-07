import type { RotaModulo } from "../tipos";
import { Urgencia } from "./Urgencia";

export const rotas: RotaModulo[] = [{ caminho: "/urgencia", elemento: <Urgencia /> }];
