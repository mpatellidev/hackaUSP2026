import type { RotaModulo } from "../tipos";
import { Profissionais } from "./Profissionais";

export const rotas: RotaModulo[] = [{ caminho: "/profissionais", elemento: <Profissionais />, aba: { caminho: "/profissionais", rotulo: "Profissionais", icone: "☺" } }];
