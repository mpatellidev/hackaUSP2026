import type { RotaModulo } from "../tipos";
import { Perfil } from "./Perfil";

export const rotas: RotaModulo[] = [{ caminho: "/perfil", elemento: <Perfil />, aba: { caminho: "/perfil", rotulo: "Perfil" } }];
