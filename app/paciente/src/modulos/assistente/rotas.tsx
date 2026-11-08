import type { RotaModulo } from "../tipos";
import { Assistente } from "./Assistente";

export const rotas: RotaModulo[] = [{ caminho: "/assistente", elemento: <Assistente />, aba: { caminho: "/assistente", rotulo: "Ajuda" } }];
