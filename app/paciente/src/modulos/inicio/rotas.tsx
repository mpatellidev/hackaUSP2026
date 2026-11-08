import { Navigate } from "react-router-dom";
import type { RotaModulo } from "../tipos";

/** O início do app é a busca de clínicas (design: abas Buscar · Meu pedido · Ajuda). */
export const rotas: RotaModulo[] = [{ caminho: "/", elemento: <Navigate to="/clinicas" replace /> }];
