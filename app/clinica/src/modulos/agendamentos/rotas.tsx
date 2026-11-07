import type { RotaModulo } from "../tipos";
import { Agendamentos } from "./Agendamentos";

export const rotas: RotaModulo[] = [{ caminho: "/agendamentos", elemento: <Agendamentos />, aba: { caminho: "/agendamentos", rotulo: "Agendamentos", icone: "▦" } }];
