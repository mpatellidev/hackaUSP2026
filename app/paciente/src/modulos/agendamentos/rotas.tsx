import type { RotaModulo } from "../tipos";
import { Agenda } from "./Agenda";

export const rotas: RotaModulo[] = [{ caminho: "/agenda", elemento: <Agenda />, aba: { caminho: "/agenda", rotulo: "Agenda", icone: "▦" } }];
