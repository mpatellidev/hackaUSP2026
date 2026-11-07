import type { RotaModulo } from "../tipos";
import { Vagas } from "./Vagas";

export const rotas: RotaModulo[] = [{ caminho: "/vagas", elemento: <Vagas />, aba: { caminho: "/vagas", rotulo: "Vagas", icone: "◷" } }];
